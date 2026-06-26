export type VoiceState =
  | { kind: 'idle' }
  | { kind: 'connecting' }
  | { kind: 'listening' }
  | { kind: 'executing' }
  | { kind: 'error'; message: string };

export type Msg =
  | { dest: 'sw';        type: 'START_SESSION';  agentId: string; language: string }
  | { dest: 'sw';        type: 'STOP_SESSION' }
  | { dest: 'sw';        type: 'TOOL_RESULT';    requestId: string; instruction: string }
  | { dest: 'sw';        type: 'OFFSCREEN_STATE_CHANGE'; state: VoiceState }
  | { dest: 'sw';        type: 'OFFSCREEN_TRANSCRIPT';   text: string }
  | { dest: 'sw';        type: 'OFFSCREEN_TOOL_CALL';    requestId: string; args: Record<string, unknown> }
  | { dest: 'offscreen'; type: 'START_SESSION';  agentId: string; language: string }
  | { dest: 'offscreen'; type: 'STOP_SESSION' }
  | { dest: 'offscreen'; type: 'TOOL_RESULT';    requestId: string; instruction: string }
  | { dest: 'content';   type: 'STATE_CHANGE';   state: VoiceState }
  | { dest: 'content';   type: 'TRANSCRIPT';     text: string }
  | { dest: 'content';   type: 'TOOL_CALL';      requestId: string; args: Record<string, unknown> };
