import { List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { streamV0 } from "../lib/v0-stream";
import { v0ApiFetcher } from "../lib/v0-api-utils";
import type { ChatDetailResponse } from "../types";
import type { CreateChatRequest } from "../types";

interface StreamingNewChatProps {
  request: CreateChatRequest;
  apiKey: string;
  scopeId?: string;
}

export default function StreamingNewChat({ request, apiKey, scopeId }: StreamingNewChatProps) {
  const [assistantContent, setAssistantContent] = useState("");
  const [finalChatId, setChatId] = useState<string | undefined>(undefined);
  const chatIdRef = useRef<string | undefined>(undefined);
  const [isStreaming, setIsStreaming] = useState(true);
  const abortRef = useRef<(() => void) | null>(null);
  const sanitizeMarkdown = (s: string) => {
    // Strip v0 knowledge-base footnote markers while streaming
    let out = s.replace(/\[\^vercel_knowledge[^\]]*\]/gi, "");
    // Also remove stray caret-prefixed tokens or partial fragments mid-stream
    out = out.replace(/\^?vercel_knowledge[_\w-]*/gi, "");
    // Clean any dangling "[^vercel_knowledge" fragment at the end of the buffer
    out = out.replace(/\[\^vercel_knowledge[^\]]*$/gi, "");
    // Remove any footnote references like "[^2]" or "[^some source]"
    out = out.replace(/\[\^[^\]]*\]/g, "");
    // Remove footnote definitions like "[^1]: details" anywhere
    out = out.replace(/^\s*\[\^[^\]]+\]:.*$/gm, "");
    // Remove dangling start of a footnote at the end
    out = out.replace(/\[\^[^\]]*$/g, "");
    return out;
  };

  const formatFullMessageContent = (content: string) => {
    let formattedContent = content.replace(/<Thinking>/g, "🧠\n");
    formattedContent = formattedContent.replace(/<\/Thinking>/g, "\n\n");
    formattedContent = formattedContent.replace(/<CodeProject[^>]*>[\s\S]*?<\/CodeProject>/g, "");
    formattedContent = formattedContent.replace(/<Actions>[\s\S]*?<\/Actions>/g, "");
    formattedContent = formattedContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameActive=\"([^\"]*)\"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 is working on:** $1\n",
    );
    formattedContent = formattedContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameComplete=\"([^\"]*)\"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 has completed:** $1\n",
    );
    formattedContent = formattedContent.replace(/<V0LaunchTasks>[\s\S]*?<\/V0LaunchTasks>/g, "");
    return formattedContent.trim();
  };

  const formatPreviewContent = (content: string) => {
    const maxLength = 100;
    let previewContent = content.replace(/<Thinking>/g, "");
    previewContent = previewContent.replace(/<\/Thinking>/g, " ");
    previewContent = previewContent.replace(/<CodeProject[^>]*>[\s\S]*?<\/CodeProject>/g, "");
    previewContent = previewContent.replace(/<Actions>[\s\S]*?<\/Actions>/g, "");
    previewContent = previewContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameActive=\"([^\"]*)\"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 is working on:** $1 ",
    );
    previewContent = previewContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameComplete=\"([^\"]*)\"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 has completed:** $1 ",
    );
    previewContent = previewContent.replace(/<V0LaunchTasks>[\s\S]*?<\/V0LaunchTasks>/g, "");
    previewContent = previewContent.replace(/\n/g, " ");
    previewContent = sanitizeMarkdown(previewContent);
    if (previewContent.length <= maxLength) {
      return previewContent.trim();
    }
    return `${previewContent.substring(0, maxLength).trim()}...`;
  };

  useEffect(() => {
    setAssistantContent("");
    setIsStreaming(true);
    const abort = streamV0({
      url: "https://api.v0.dev/v1/chats",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-scope": scopeId || "",
      },
      body: { ...request, responseMode: "experimental_stream" },
      onDelta: (text) => setAssistantContent((prev) => sanitizeMarkdown(prev + text)),
      onChatUpdate: (chat) => {
        if (chat?.id) {
          chatIdRef.current = chat.id;
          setChatId(chat.id);
        }
      },
      onDone: async () => {
        setIsStreaming(false);
        abortRef.current = null;
        // After streaming completes, load the canonical chat text if available
        try {
          const resolvedId = chatIdRef.current || finalChatId;
          if (resolvedId) {
            const detail = await v0ApiFetcher<ChatDetailResponse>(`https://api.v0.dev/v1/chats/${resolvedId}`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "x-scope": scopeId || "",
              },
            });
            if (detail?.text && typeof detail.text === "string") {
              setAssistantContent(sanitizeMarkdown(detail.text));
            }
          }
        } catch {
          // ignore fetch errors here; we already have streamed content
        }
      },
      onError: () => {
        setIsStreaming(false);
        abortRef.current = null;
      },
      debug: true,
    });
    abortRef.current = abort;
    return () => {
      if (abortRef.current) {
        abortRef.current();
        abortRef.current = null;
      }
    };
  }, [request, apiKey, scopeId]);

  const preview = assistantContent ? formatPreviewContent(assistantContent) : isStreaming ? "Streaming..." : "Ready";
  return (
    <List isShowingDetail navigationTitle="New Chat (Streaming)">
      <List.Item
        title={preview}
        detail={
          <List.Item.Detail
            markdown={assistantContent ? formatFullMessageContent(assistantContent) : "_Waiting for response…_"}
          />
        }
      />
    </List>
  );
}
