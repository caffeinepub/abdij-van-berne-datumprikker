import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Participant } from "../backend.d";
import { useActor } from "./useActor";

export function useGetAllParticipants() {
  const { actor, isFetching } = useActor();
  return useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllParticipants();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
  });
}

export function useUpdateAvailability() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      dates,
    }: {
      name: string;
      dates: string[];
    }) => {
      if (!actor) throw new Error("No actor available");
      return actor.updateAvailability(name, dates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants"] });
    },
  });
}
