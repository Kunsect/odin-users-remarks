import { Storage } from '@plasmohq/storage'

const storage = new Storage()

export const waittingBetween = (minMs: number, maxMs: number) =>
  new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * (maxMs - minMs)) + minMs))

export const logMessage = async (message: Object) => {
  const logs = (await storage.get<string[]>('logs')) || []
  logs.push(JSON.stringify({ time: new Date().toISOString(), ...message }))
  await storage.set('logs', logs)
}
