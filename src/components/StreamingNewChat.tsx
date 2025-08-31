import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { streamV0 } from "../lib/v0-stream";
import { v0ApiFetcher } from "../lib/v0-api-utils";
import type { ChatDetailResponse } from "../types";
import type { CreateChatRequest } from "../types";

interface StreamingNewChatProps {
  // One of request (create new chat) or chatId (open existing)
  request?: CreateChatRequest;
  chatId?: string;
  apiKey: string;
  scopeId?: string;
}

export default function StreamingNewChat({ request, chatId, apiKey, scopeId }: StreamingNewChatProps) {
  const [assistantContent, setAssistantContent] = useState("");
  const [finalChatId, setChatId] = useState<string | undefined>(undefined);
  const chatIdRef = useRef<string | undefined>(undefined);
  const [isStreaming, setIsStreaming] = useState(true);
  const abortRef = useRef<(() => void) | null>(null);
  const [searchText, setSearchText] = useState("");
  const currentStreamIdRef = useRef<string | undefined>(undefined);

  type MessageRow = { id: string; role: "user" | "assistant"; content: string; createdAt?: string };
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const nowIso = () => new Date().toISOString();
  const sortNewestFirst = (rows: MessageRow[]) =>
    [...rows].sort((a, b) => new Date(b.createdAt || nowIso()).getTime() - new Date(a.createdAt || nowIso()).getTime());
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

  const appendSmart = (prev: string, incoming: string) => {
    if (!incoming) return prev;
    let chunk = incoming;
    // De-duplicate overlaps between tail of prev and head of chunk
    const maxOverlap = Math.min(20, prev.length, chunk.length);
    for (let k = maxOverlap; k > 0; k--) {
      if (prev.slice(-k) === chunk.slice(0, k)) {
        chunk = chunk.slice(k);
        break;
      }
    }
    // Add a space between alpha/number boundaries if needed
    const last = prev.slice(-1);
    const first = chunk.charAt(0);
    if (last && first && /[A-Za-z0-9]/.test(last) && /[A-Za-z0-9]/.test(first)) {
      chunk = " " + chunk;
    }
    return prev + chunk;
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

  // Create-chat streaming mode
  useEffect(() => {
    if (!request) return;
    setAssistantContent("");
    setIsStreaming(true);
    // Seed UI immediately: user message and an assistant placeholder at the top
    const initialStreamId = `assistant-stream-${Date.now()}`;
    currentStreamIdRef.current = initialStreamId;
    setMessages([
      { id: initialStreamId, role: "assistant", content: "", createdAt: nowIso() },
      { id: "user-initial", role: "user", content: request.message, createdAt: nowIso() },
    ]);
    const abort = streamV0({
      url: "https://api.v0.dev/v1/chats",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-scope": scopeId || "",
      },
      body: { ...request, responseMode: "experimental_stream" },
      onDelta: (text) => {
        const chunk = sanitizeMarkdown(text);
        setAssistantContent((prev) => appendSmart(prev, chunk));
        setMessages((prev) => {
          // Update the current streaming placeholder by id
          const streamId = currentStreamIdRef.current;
          const idx = prev.findIndex((r) => r.id === streamId);
          if (idx === -1) {
            return [
              {
                id: streamId || `assistant-stream-${Date.now()}`,
                role: "assistant",
                content: chunk,
                createdAt: nowIso(),
              },
              ...prev,
            ];
          }
          const updated = [...prev];
          updated[idx] = { ...updated[idx], content: appendSmart(updated[idx].content, chunk) };
          return updated;
        });
      },
      onChatUpdate: (chat) => {
        if (chat?.id) {
          chatIdRef.current = chat.id;
          setChatId(chat.id);
        }
        if (chat?.messages && Array.isArray(chat.messages)) {
          type M = { id?: string; role: "user" | "assistant"; content?: string; createdAt?: string };
          const rows = (chat.messages as M[]).map((m: M) => ({
            id: m.id || Math.random().toString(),
            role: m.role,
            content: sanitizeMarkdown(m.content || ""),
            createdAt: m.createdAt || nowIso(),
          }));
          const sorted = sortNewestFirst(rows);
          setMessages((prev) => {
            let newRows = sorted;
            if (isStreaming) {
              // Drop empty assistant rows during streaming
              newRows = newRows.filter(
                (r) => !(r.role === "assistant" && (!r.content || r.content.trim().length === 0)),
              );
              // Deduplicate the initial user message we already seeded
              const prevUsers = prev.filter((r) => r.role === "user");
              const existingUserContents = new Set(prevUsers.map((r) => r.content.trim()));
              newRows = newRows.filter((r) => !(r.role === "user" && existingUserContents.has(r.content.trim())));
              // If we have a streaming placeholder, keep it and merge content if available
              const hasPlaceholder = prev.find((r) => r.id === currentStreamIdRef.current);
              if (hasPlaceholder) {
                const firstAssistantIdx = newRows.findIndex((r) => r.role === "assistant");
                if (
                  firstAssistantIdx >= 0 &&
                  newRows[firstAssistantIdx].content &&
                  newRows[firstAssistantIdx].content.trim().length > 0
                ) {
                  const merged = { ...hasPlaceholder, content: newRows[firstAssistantIdx].content };
                  newRows.splice(firstAssistantIdx, 1);
                  return [merged, ...prevUsers, ...newRows];
                }
                return [hasPlaceholder, ...prevUsers, ...newRows];
              }
            }
            // Not streaming: show newest-first from snapshot
            return newRows;
          });
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
              setMessages((prev) => {
                const cloned = [...prev];
                if (cloned.length > 0 && cloned[0].role === "assistant") {
                  cloned[0] = { ...cloned[0], content: sanitizeMarkdown(detail.text || "") };
                }
                return cloned;
              });
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

  // Existing chat mode: load messages and idle until user sends follow-up
  useEffect(() => {
    const loadExisting = async () => {
      if (!chatId) return;
      setIsStreaming(false);
      try {
        const detail = await v0ApiFetcher<ChatDetailResponse>(`https://api.v0.dev/v1/chats/${chatId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "x-scope": scopeId || "",
          },
        });
        if (detail?.messages) {
          type M = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
          const rows = (detail.messages as M[]).map((m) => ({
            id: m.id,
            role: m.role,
            content: sanitizeMarkdown(m.content || ""),
            createdAt: m.createdAt || nowIso(),
          }));
          setMessages(sortNewestFirst(rows));
        }
      } catch {
        // ignore
      }
    };
    void loadExisting();
  }, [chatId, apiKey, scopeId]);

  const preview = assistantContent
    ? formatPreviewContent(assistantContent)
    : isStreaming
      ? "🧠 v0 is thinking…"
      : "Ready";

  const sendFollowUp = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (isStreaming) return;
    const cid = chatIdRef.current || finalChatId || chatId;
    if (!cid) return;
    // Optimistic user + placeholder assistant
    const followupStreamId = `assistant-stream-${Date.now()}`;
    currentStreamIdRef.current = followupStreamId;
    setMessages((prev) => [
      { id: followupStreamId, role: "assistant", content: "", createdAt: nowIso() },
      { id: `user-${Date.now()}`, role: "user", content: trimmed, createdAt: nowIso() },
      ...prev,
    ]);
    setAssistantContent("");
    setIsStreaming(true);
    setSearchText("");
    const abort = streamV0({
      url: `https://api.v0.dev/v1/chats/${cid}/messages`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-scope": scopeId || "",
      },
      body: { message: trimmed, responseMode: "experimental_stream" },
      onDelta: (delta) => {
        const chunk = sanitizeMarkdown(delta);
        setAssistantContent((prev) => appendSmart(prev, chunk));
        setMessages((prev) => {
          const streamId = currentStreamIdRef.current;
          const idx = prev.findIndex((r) => r.id === streamId);
          if (idx === -1) {
            return [
              {
                id: streamId || `assistant-stream-${Date.now()}`,
                role: "assistant",
                content: chunk,
                createdAt: nowIso(),
              },
              ...prev,
            ];
          }
          const updated = [...prev];
          updated[idx] = { ...updated[idx], content: appendSmart(updated[idx].content, chunk) };
          return updated;
        });
      },
      onDone: () => {
        setIsStreaming(false);
        abortRef.current = null;
      },
      onError: () => {
        setIsStreaming(false);
        abortRef.current = null;
      },
      debug: true,
    });
    abortRef.current = abort;
  };

  return (
    <List
      isShowingDetail
      navigationTitle="New Chat (Streaming)"
      searchBarPlaceholder="Ask another question…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {messages.length === 0 ? (
        <List.Item
          title={preview}
          detail={
            <List.Item.Detail
              markdown={assistantContent ? formatFullMessageContent(assistantContent) : "🧠 v0 is thinking…_"}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Ask"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
                onAction={() => sendFollowUp(searchText)}
              />
            </ActionPanel>
          }
        />
      ) : (
        messages.map((m, idx) => (
          <List.Item
            key={m.id || `${m.role}-${idx}`}
            title={formatPreviewContent(m.content) || (m.role === "user" ? "You" : "🧠 v0 is thinking…")}
            detail={<List.Item.Detail markdown={formatFullMessageContent(m.content) || "_…_"} />}
            actions={
              <ActionPanel>
                <Action
                  title="Ask"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  onAction={() => sendFollowUp(searchText)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
