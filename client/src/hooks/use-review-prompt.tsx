import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { PlatformReviewModal } from "@/components/platform-review-modal";

/**
 * Hook that automatically checks for review prompts and shows the review modal
 * when users reach certain milestones (first payout, earnings milestones, etc.)
 */
export function useReviewPrompt() {
  const { user } = useAuth();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<any>(null);
  
  // Check if user should be prompted for a review
  const { data: promptCheck } = useQuery({
    queryKey: ["/api/review-prompts/check"],
    enabled: !!user,
    // Check every 5 minutes for new prompts
    refetchInterval: 5 * 60 * 1000,
    // Don't refetch on window focus to avoid spam
    refetchOnWindowFocus: false,
  });
  
  // Create a review prompt when showing the modal
  const createPromptMutation = useMutation({
    mutationFn: async (promptData: { triggerType: string; triggerValue: string }) => {
      const response = await apiRequest("POST", "/api/review-prompts", promptData);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentPrompt(data.prompt);
      setShowReviewModal(true);
    },
  });
  
  // Effect to show review prompt when milestone is reached
  useEffect(() => {
    if (promptCheck?.shouldPrompt && promptCheck.triggerType && promptCheck.triggerValue) {
      // Create a prompt record and show the modal
      createPromptMutation.mutate({
        triggerType: promptCheck.triggerType,
        triggerValue: promptCheck.triggerValue,
      });
    }
  }, [promptCheck?.shouldPrompt, promptCheck?.triggerType, promptCheck?.triggerValue]);
  
  const closeModal = () => {
    setShowReviewModal(false);
    setCurrentPrompt(null);
  };
  
  const ReviewPromptModal = () => {
    if (!showReviewModal || !currentPrompt) return null;
    
    return (
      <PlatformReviewModal
        open={showReviewModal}
        onClose={closeModal}
        triggerType={currentPrompt.triggerType}
        triggerValue={currentPrompt.triggerValue}
        promptId={currentPrompt.id}
      />
    );
  };
  
  return {
    showReviewModal,
    setShowReviewModal,
    currentPrompt,
    ReviewPromptModal,
  };
}

/**
 * Component that automatically handles review prompts across the app
 * Add this to your main App component to enable automatic review prompts
 */
export function ReviewPromptProvider({ children }: { children: React.ReactNode }) {
  const { ReviewPromptModal } = useReviewPrompt();
  
  return (
    <>
      {children}
      <ReviewPromptModal />
    </>
  );
}