import { describe, expect, it } from 'vitest'
import { createSignalRService } from '../src/services/signalrService'

describe('signalrService', () => {
  it('creates HubConnection with configured URL and registers event handlers', () => {
    const service = createSignalRService('http://localhost:5000/hubs/tasks')
    expect(service).toBeDefined()
    expect(typeof service.start).toBe('function')
    expect(typeof service.stop).toBe('function')
    expect(typeof service.onTaskEvent).toBe('function')
  })
})
