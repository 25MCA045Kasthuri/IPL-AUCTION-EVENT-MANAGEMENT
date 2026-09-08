#!/usr/bin/env bash
#
# migrate-portal-to-new-cluster.sh
# ---------------------------------
# Clones the Test Portal database ("swap2k26") from the CURRENT shared Atlas cluster
# (cluster0.zg96djw.mongodb.net) into a BRAND-NEW Atlas cluster you create under a
# different sign-in.
#
# SAFE: It only READS from the source and WRITES to the destination. It does NOT
# delete or modify anything on the source cluster.
#
# USAGE:
#   1) Create your NEW Atlas cluster under the other sign-in.
#   2) In Atlas, add your IP to Network Access, create a DB user, and copy the
#      connection string (looks like:  mongodb+srv://USER:PASS@YOURCLUSTER.mongodb.net)
#   3) Run this script, passing your new connection string:
#         bash scripts/migrate-portal-to-new-cluster.sh "mongodb+srv://USER:PASS@YOURCLUSTER.mongodb.net"
#
# What gets copied (the Test Portal data living in the "swap2k26" database):
#   questions, candidates, admins, examattempts, malpracticelogs, settings
#
set -euo pipefail

# --- 1. Source (current shared cluster, Test Portal DB) ---------------------
# Reads the source URI the same way the Test Portal app does.
SRC_ENV_FILE="/home/breath/Test Portal/backend/.env"
SRC_URI="$(grep MONGODB_URI "$SRC_ENV_FILE" | cut -d= -f2-)"
SRC_DB="swap2k26"          # database that currently holds the Test Portal data
PORTAL_COLLECTIONS=(questions candidates admins examattempts malpracticelogs settings)

# --- 2. Destination (your NEW cluster) ---------------------------------------
if [[ $# -lt 1 ]]; then
  echo "ERROR: Pass your NEW Atlas cluster connection string as the first argument."
  echo
  echo "Example:"
  echo "  bash scripts/migrate-portal-to-new-cluster.sh \"mongodb+srv://USER:PASS@YOURCLUSTER.mongodb.net\""
  exit 1
fi
DEST_URI="$1"
DEST_DB="swap2k26"          # database name to create on the new cluster (see note below)

# Optional: change the destination database name via the second argument.
if [[ $# -ge 2 ]]; then
  DEST_DB="$2"
fi

echo "SOURCE      : $SRC_DB on $SRC_URI"
echo "DESTINATION : $DEST_DB on $DEST_URI"
echo
echo "Collections to copy: ${PORTAL_COLLECTIONS[*]}"
echo

# --- 3. Export each collection from source to a temp dir ---------------------
TMPDIR=$(mktemp -d)
echo "[1/4] Exporting from source (read-only) ..."
for col in "${PORTAL_COLLECTIONS[@]}"; do
  mongodump \
    --uri="$SRC_URI" \
    --db="$SRC_DB" \
    --collection="$col" \
    --out="$TMPDIR" \
    >/dev/null 2>&1 && echo "  exported: $col"
done

# --- 4. Import each collection into the destination --------------------------
echo "[2/4] Importing into destination ...
"
for dir in "$TMPDIR/$SRC_DB"/*.bson; do
  [ -e "$dir" ] || continue
  col="$(basename "$dir" .bson)"
  mongorestore \
    --uri="$DEST_URI" \
    --nsInclude="$DEST_DB.$col" \
    --drop \
    "$dir" >/dev/null 2>&1 \
    && echo "  restored: $DEST_DB.$col"
done

# --- 5. Verify destination counts match source --------------------------------
# Helper: insert a database name into a URI, correctly handling a query string.
db_uri() { # db_uri <uri> <db>
  local uri="$1" db="$2"
  if [[ "$uri" == *"?"* ]]; then
    local base="${uri%%\?*}"
    base="${base%/}"
    echo "${base}/$db?${uri#*\?}"
  else
    echo "${uri%/}/$db"
  fi
}

echo
echo "[3/4] Verifying ..."
SRC_DB_URI="$(db_uri "$SRC_URI" "$SRC_DB")"
DEST_DB_URI="$(db_uri "$DEST_URI" "$DEST_DB")"
for col in "${PORTAL_COLLECTIONS[@]}"; do
  src=$(mongosh "$SRC_DB_URI" --quiet --eval "db.getCollection('$col').countDocuments()" 2>/dev/null)
  dst=$(mongosh "$DEST_DB_URI" --quiet --eval "db.getCollection('$col').countDocuments()" 2>/dev/null)
  printf "  %-15s source=%s  dest=%s  %s\n" "$col" "$src" "$dst" \
    "$([[ "$src" == "$dst" ]] && echo 'OK' || echo 'MISMATCH')"
done

rm -rf "$TMPDIR"
echo
echo "[4/4] Done."
echo
echo "NEXT STEP: point the Test Portal at the new cluster."
echo "  Edit /home/breath/Test Portal/backend/.env and set MONGODB_URI to your NEW"
echo "  connection string (with /$DEST_DB appended before the ? if not already)."
echo
echo "  Example:"
echo "    MONGODB_URI=mongodb+srv://USER:PASS@YOURCLUSTER.mongodb.net/$DEST_DB?appName=Cluster0"
