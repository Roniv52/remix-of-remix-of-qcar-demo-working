CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: check_pending_scans_on_profile_create(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_pending_scans_on_profile_create() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  pending_scan RECORD;
  new_profile profiles%ROWTYPE;
BEGIN
  -- Get the newly created profile with phone
  SELECT * INTO new_profile FROM profiles WHERE user_id = NEW.user_id;
  
  -- If no phone yet, exit early
  IF new_profile.phone IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find matching pending scans by phone or email
  FOR pending_scan IN
    SELECT pcs.*, p.policyholder_name, v.vehicle_number, v.make, v.model
    FROM pending_claim_scans pcs
    LEFT JOIN policies p ON p.id = pcs.policy_id
    LEFT JOIN vehicles v ON v.id = p.vehicle_id
    WHERE pcs.status = 'pending'
    AND (
      pcs.scanner_phone = new_profile.phone
      OR pcs.scanner_email = (SELECT email FROM auth.users WHERE id = NEW.user_id)
    )
  LOOP
    -- Update the pending scan as matched
    UPDATE pending_claim_scans
    SET status = 'matched',
        matched_user_id = NEW.user_id,
        matched_at = now(),
        updated_at = now()
    WHERE id = pending_scan.id;
    
    -- Create notification for the policy owner
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      pending_scan.policy_owner_id,
      'other_party_registered',
      'Other Party Now Registered',
      'The person involved in your accident (' || COALESCE(new_profile.full_name, 'Unknown') || ') has registered. Their details are now available.',
      jsonb_build_object(
        'pending_scan_id', pending_scan.id,
        'matched_user_id', NEW.user_id,
        'matched_user_name', new_profile.full_name,
        'vehicle', pending_scan.vehicle_number || ' ' || COALESCE(pending_scan.make, '') || ' ' || COALESCE(pending_scan.model, '')
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: accident_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accident_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user1_id uuid NOT NULL,
    user2_session_id text NOT NULL,
    user2_user_id uuid,
    status text DEFAULT 'pending_user2_details'::text NOT NULL,
    user1_data jsonb DEFAULT '{}'::jsonb,
    user2_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    CONSTRAINT accident_cases_status_check CHECK ((status = ANY (ARRAY['pending_user2_details'::text, 'sent_to_user1'::text, 'in_progress'::text, 'completed'::text])))
);


--
-- Name: claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    policy_id uuid,
    other_party_name text,
    other_party_vehicle text,
    other_party_insurance text,
    incident_location text,
    incident_time timestamp with time zone,
    weather_conditions text,
    description text,
    photos text[],
    status text DEFAULT 'draft'::text,
    pdf_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    other_party_id_number text,
    other_party_gender text,
    other_party_date_of_birth date,
    other_party_phone text,
    other_party_address text,
    other_party_license_number text,
    other_party_license_year_of_issue integer,
    other_party_license_expiry date,
    other_party_vehicle_type text,
    other_party_vehicle_color text,
    other_party_vehicle_year integer,
    other_party_vehicle_make text,
    other_party_vehicle_model text,
    other_party_policy_number text,
    other_party_policyholder_name text,
    other_party_policyholder_id text,
    other_party_coverage_type text,
    other_party_policy_valid_from date,
    other_party_policy_valid_until date,
    other_party_agent_name text,
    has_witnesses boolean DEFAULT false,
    witness_1_name text,
    witness_1_phone text,
    witness_1_address text,
    witness_1_statement text,
    witness_2_name text,
    witness_2_phone text,
    witness_2_address text,
    witness_2_statement text,
    accident_case_id uuid
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pending_claim_scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_claim_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_id uuid NOT NULL,
    policy_owner_id uuid NOT NULL,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    scanner_phone text NOT NULL,
    scanner_email text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    matched_user_id uuid,
    matched_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid,
    policy_number text,
    insurance_company text,
    coverage_type text,
    valid_from date,
    valid_until date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    policyholder_name text,
    policyholder_id text,
    agent_name text,
    token uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    phone text,
    address text,
    license_number text,
    license_expiry date,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id_number text,
    gender text,
    date_of_birth date,
    license_year_of_issue integer
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vehicle_number text NOT NULL,
    make text,
    model text,
    year integer,
    color text,
    vin text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vehicle_type text
);


--
-- Name: accident_cases accident_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accident_cases
    ADD CONSTRAINT accident_cases_pkey PRIMARY KEY (id);


--
-- Name: claims claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pending_claim_scans pending_claim_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_claim_scans
    ADD CONSTRAINT pending_claim_scans_pkey PRIMARY KEY (id);


--
-- Name: policies policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_pkey PRIMARY KEY (id);


--
-- Name: policies policies_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_token_key UNIQUE (token);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: idx_accident_cases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accident_cases_status ON public.accident_cases USING btree (status);


--
-- Name: idx_accident_cases_user1_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accident_cases_user1_id ON public.accident_cases USING btree (user1_id);


--
-- Name: idx_accident_cases_user2_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accident_cases_user2_session_id ON public.accident_cases USING btree (user2_session_id);


--
-- Name: idx_policies_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_policies_token ON public.policies USING btree (token);


--
-- Name: profiles on_profile_insert_check_pending_scans; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_insert_check_pending_scans AFTER INSERT ON public.profiles FOR EACH ROW WHEN ((new.phone IS NOT NULL)) EXECUTE FUNCTION public.check_pending_scans_on_profile_create();


--
-- Name: profiles on_profile_update_check_pending_scans; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_update_check_pending_scans AFTER UPDATE ON public.profiles FOR EACH ROW WHEN (((old.phone IS DISTINCT FROM new.phone) AND (new.phone IS NOT NULL))) EXECUTE FUNCTION public.check_pending_scans_on_profile_create();


--
-- Name: accident_cases update_accident_cases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accident_cases_updated_at BEFORE UPDATE ON public.accident_cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: claims update_claims_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pending_claim_scans update_pending_claim_scans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pending_claim_scans_updated_at BEFORE UPDATE ON public.pending_claim_scans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: policies update_policies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vehicles update_vehicles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accident_cases accident_cases_user1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accident_cases
    ADD CONSTRAINT accident_cases_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: accident_cases accident_cases_user2_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accident_cases
    ADD CONSTRAINT accident_cases_user2_user_id_fkey FOREIGN KEY (user2_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: claims claims_accident_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_accident_case_id_fkey FOREIGN KEY (accident_case_id) REFERENCES public.accident_cases(id) ON DELETE SET NULL;


--
-- Name: claims claims_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id) ON DELETE SET NULL;


--
-- Name: claims claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pending_claim_scans pending_claim_scans_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_claim_scans
    ADD CONSTRAINT pending_claim_scans_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id) ON DELETE CASCADE;


--
-- Name: policies policies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: policies policies_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vehicles vehicles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: accident_cases Allow anonymous insert to accident_cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous insert to accident_cases" ON public.accident_cases FOR INSERT WITH CHECK (true);


--
-- Name: claims Allow guest claim submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow guest claim submissions" ON public.claims FOR INSERT WITH CHECK ((user_id IN ( SELECT policies.user_id
   FROM public.policies
  WHERE (policies.id IS NOT NULL))));


--
-- Name: profiles Allow reading profile via policy token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow reading profile via policy token" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.policies
  WHERE (policies.user_id = profiles.user_id))));


--
-- Name: vehicles Allow reading vehicle via policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow reading vehicle via policy" ON public.vehicles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.policies
  WHERE (policies.vehicle_id = vehicles.id))));


--
-- Name: accident_cases Anyone can create accident cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create accident cases" ON public.accident_cases FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: pending_claim_scans Anyone can create pending scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create pending scans" ON public.pending_claim_scans FOR INSERT WITH CHECK (true);


--
-- Name: policies Anyone can read policy by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read policy by token" ON public.policies FOR SELECT USING (true);


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: accident_cases User1 can update their accident cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User1 can update their accident cases" ON public.accident_cases FOR UPDATE USING ((auth.uid() = user1_id));


--
-- Name: accident_cases User1 can view their accident cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User1 can view their accident cases" ON public.accident_cases FOR SELECT USING ((auth.uid() = user1_id));


--
-- Name: accident_cases User2 can update their accident cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User2 can update their accident cases" ON public.accident_cases FOR UPDATE USING ((auth.uid() = user2_user_id));


--
-- Name: accident_cases User2 can view their accident cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User2 can view their accident cases" ON public.accident_cases FOR SELECT USING ((auth.uid() = user2_user_id));


--
-- Name: claims Users can delete their own claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own claims" ON public.claims FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: policies Users can delete their own policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own policies" ON public.policies FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: vehicles Users can delete their own vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own vehicles" ON public.vehicles FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: claims Users can insert their own claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own claims" ON public.claims FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: policies Users can insert their own policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own policies" ON public.policies FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: vehicles Users can insert their own vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own vehicles" ON public.vehicles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: accident_cases Users can update their accident cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their accident cases" ON public.accident_cases FOR UPDATE USING (((auth.uid() = user1_id) OR (auth.uid() = user2_user_id)));


--
-- Name: claims Users can update their own claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own claims" ON public.claims FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: pending_claim_scans Users can update their own pending scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own pending scans" ON public.pending_claim_scans FOR UPDATE USING (((auth.uid() = policy_owner_id) OR (auth.uid() = matched_user_id)));


--
-- Name: policies Users can update their own policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own policies" ON public.policies FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: vehicles Users can update their own vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own vehicles" ON public.vehicles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: pending_claim_scans Users can view pending scans for their policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view pending scans for their policies" ON public.pending_claim_scans FOR SELECT USING ((auth.uid() = policy_owner_id));


--
-- Name: accident_cases Users can view their accident cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their accident cases" ON public.accident_cases FOR SELECT USING (((auth.uid() = user1_id) OR (auth.uid() = user2_user_id)));


--
-- Name: claims Users can view their own claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own claims" ON public.claims FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: policies Users can view their own policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own policies" ON public.policies FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: vehicles Users can view their own vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own vehicles" ON public.vehicles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: accident_cases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accident_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_claim_scans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_claim_scans ENABLE ROW LEVEL SECURITY;

--
-- Name: policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;