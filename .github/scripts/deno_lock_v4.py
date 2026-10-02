"""Copy a deno.lock, converting lock format v5 to v4 the way Supabase Edge Runtime reads it.

Supabase Edge Runtime embeds Deno 2.1.4, whose lock reader stops at v4. The runtime loads a v5
lock by converting it first (supabase/edge-runtime, deno/args/lockfile.rs,
downgrade_lockfile_v5_to_v4_if_needed). CI applies the same conversion so that Deno 2.1.4 checks
the function against the dependency versions the runtime uses. Other files are copied unchanged.

Usage: python deno_lock_v4.py SOURCE DESTINATION
"""
import json
import pathlib
import sys

# Fields that only lock v5 records for npm packages; the runtime drops them.
V5_ONLY_FIELDS = ("optionalPeers", "os", "cpu", "tarball", "deprecated", "scripts", "bin")

source, destination = (pathlib.Path(arg) for arg in sys.argv[1:3])
data = source.read_bytes()
try:
    lock = json.loads(data)
except ValueError:
    lock = None

if isinstance(lock, dict) and lock.get("version") == "5":
    lock["version"] = "4"
    npm = lock.get("npm")
    for package in npm.values() if isinstance(npm, dict) else ():
        if not isinstance(package, dict):
            continue
        # v4 has no separate list of optional dependencies.
        dependencies = []
        for field in ("dependencies", "optionalDependencies"):
            value = package.pop(field, None)
            if isinstance(value, list):
                dependencies.extend(value)
        for field in V5_ONLY_FIELDS:
            package.pop(field, None)
        if dependencies:
            package["dependencies"] = dependencies
    data = (json.dumps(lock, indent=2) + "\n").encode("utf-8")

destination.write_bytes(data)
