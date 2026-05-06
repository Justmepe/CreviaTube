import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { apiRequest } from "@/lib/queryClient";

type NonceResponse = { nonce: string; issuedAt: string; message: string };

export function useWalletBind() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Connect a wallet first");

      const nonceRes = await apiRequest("GET", `/api/wallet/nonce?address=${address}`);
      if (!nonceRes.ok) {
        const err = await nonceRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch nonce");
      }
      const { message } = (await nonceRes.json()) as NonceResponse;

      const signature = await signMessageAsync({ message });

      const bindRes = await apiRequest("POST", "/api/wallet/bind", { address, signature });
      if (!bindRes.ok) {
        const err = await bindRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to bind wallet");
      }
      return (await bindRes.json()) as { success: true; walletAddress: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });
}

export function useWalletUnbind() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wallet/unbind", {});
      if (!res.ok) throw new Error("Failed to unbind wallet");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user"] }),
  });
}
