import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface LayoutProps {
  preview: string;
  children: React.ReactNode;
}

/**
 * Shared shell for all CreviaTube transactional emails.
 * Uses Tailwind via @react-email so the markup looks like normal JSX.
 */
export function Layout({ preview, children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="bg-white max-w-[560px] mx-auto my-8 p-8 rounded-lg border border-slate-200">
            <Section>
              <Text className="text-2xl font-bold text-slate-900 m-0">CreviaTube</Text>
              <Text className="text-xs text-slate-500 m-0 mt-1">
                Creator + clipper marketplace
              </Text>
            </Section>
            <Hr className="border-slate-200 my-6" />
            {children}
            <Hr className="border-slate-200 mt-8 mb-4" />
            <Text className="text-xs text-slate-400">
              You're receiving this because you have a CreviaTube account.
              {" "}If this wasn't you, please contact support.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
