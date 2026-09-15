#!/usr/bin/env python3
"""Hold a kernel advisory lock across exec; crashes release it without deleting lockfiles."""
import fcntl
import os
import sys

root = os.path.expanduser('~/.config/friend-link-automation')
os.makedirs(root, mode=0o700, exist_ok=True)
fd = os.open(os.path.join(root, 'worker.lock'), os.O_CREAT | os.O_RDWR, 0o600)
try:
    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    sys.exit('Worker already active; stop it before mutating manual commands.')
os.set_inheritable(fd, True)
env = dict(os.environ, FRIEND_LINK_LOCK_FD=str(fd))
os.execvpe(sys.argv[1], sys.argv[1:], env)
