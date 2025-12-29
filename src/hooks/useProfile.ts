import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  license_number: string | null;
  license_expiry: string | null;
  avatar_url: string | null;
  id_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  license_year_of_issue: number | null;
}

export interface Vehicle {
  id: string;
  user_id: string;
  vehicle_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  vin: string | null;
  vehicle_type: string | null;
}

export interface Policy {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  policy_number: string | null;
  insurance_company: string | null;
  coverage_type: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  policyholder_name: string | null;
  policyholder_id: string | null;
  agent_name: string | null;
  vehicle?: Vehicle;
}

export function useProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setVehicles([]);
          setPolicies([]);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      setProfile(profileData);

      // Check if user needs onboarding (no license number set)
      if (!profileData?.license_number) {
        setNeedsOnboarding(true);
      }

      // Fetch vehicles
      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", userId);

      setVehicles(vehiclesData || []);

      // Fetch policies with vehicle data
      const { data: policiesData } = await supabase
        .from("policies")
        .select("*")
        .eq("user_id", userId);

      // Attach vehicle data to policies
      const policiesWithVehicles = (policiesData || []).map(policy => ({
        ...policy,
        vehicle: vehiclesData?.find(v => v.id === policy.vehicle_id),
      }));

      setPolicies(policiesWithVehicles);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    if (user) {
      setLoading(true);
      fetchUserData(user.id);
    }
  };

  return {
    user,
    profile,
    vehicles,
    policies,
    loading,
    needsOnboarding,
    refetch,
  };
}
