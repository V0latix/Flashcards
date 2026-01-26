import { enqueueRemoteDelete, requestSync } from './engine'

export const markLocalChange = () => {
  requestSync()
}

export const queueCardDelete = (cloudId?: string | null) => {
  if (cloudId) {
    enqueueRemoteDelete(cloudId)
    return
  }
  requestSync()
}
