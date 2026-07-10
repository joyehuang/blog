import { getDestinationType } from '@/lib/analytics'

import { getNode, resolvePath } from './fs'
import type { FsNode } from './fs/types'

type TerminalCommandAnalytics = {
  command_result: string
  destination_type: string | null
}

export function classifyTerminalCommand(
  command: string,
  args: string[],
  fs: FsNode,
  cwd: string,
  known: boolean
): TerminalCommandAnalytics {
  if (!known) {
    return {
      command_result: 'unknown_command',
      destination_type: null
    }
  }

  if (command === 'mail') {
    return {
      command_result: 'mailto_open',
      destination_type: 'mailto'
    }
  }

  if (command === 'open') {
    const input = args[0]
    if (!input) {
      return {
        command_result: 'error',
        destination_type: null
      }
    }

    if (/^\/(blog|notes|search|projects|links|about|contact)(\/|$)/.test(input)) {
      return {
        command_result: 'navigation',
        destination_type: 'internal'
      }
    }

    const node = getNode(fs, resolvePath(cwd, input))
    if (node?.type === 'link') {
      return {
        command_result: 'external_open',
        destination_type: getDestinationType(node.href)
      }
    }
    if (node?.type === 'file' && node.href) {
      return {
        command_result: 'navigation',
        destination_type: 'internal'
      }
    }
  }

  return {
    command_result: 'success',
    destination_type: null
  }
}
