import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'

export interface SignalRService {
  start(): Promise<void>
  stop(): Promise<void>
  isConnected(): boolean
  onTaskEvent(callback: () => void): void
}

export function createSignalRService(
  hubUrl = import.meta.env.VITE_HUB_URL ?? 'http://localhost:5000/hubs/tasks'
): SignalRService {
  let connection: HubConnection | null = null
  const listeners: Array<() => void> = []

  function getConnection(): HubConnection {
    if (!connection) {
      connection = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(LogLevel.Warning)
        .build()

      connection.on('TaskCreated', () => listeners.forEach(fn => fn()))
      connection.on('TaskUpdated', () => listeners.forEach(fn => fn()))
      connection.on('TaskDeleted', () => listeners.forEach(fn => fn()))
    }
    return connection
  }

  return {
    async start(): Promise<void> {
      const conn = getConnection()
      if (conn.state === HubConnectionState.Disconnected) {
        try {
          await conn.start()
        } catch {
          // Graceful fallback if backend offline
        }
      }
    },
    async stop(): Promise<void> {
      if (connection && connection.state !== HubConnectionState.Disconnected) {
        await connection.stop()
      }
    },
    isConnected(): boolean {
      return connection?.state === HubConnectionState.Connected
    },
    onTaskEvent(callback: () => void): void {
      listeners.push(callback)
    },
  }
}

export const signalRService = createSignalRService()
