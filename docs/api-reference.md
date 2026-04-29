# ztcwm — ZeroTier API Reference

> **Scope.** These are upstream ZeroTier One controller and node API endpoints.
> The ZTCWM backend proxies a subset of these via `/api/zt/*`.
> The frontend never calls these endpoints directly — all calls go through the backend's proxy.
> This document is intended for backend maintainers debugging proxy behavior or extending proxy coverage.

This document describes all ZeroTier One controller and node API endpoints used by ztcwm. All endpoints require the `X-ZT1-Auth` header with the contents of `authtoken.secret`.

---

## Authentication

All requests must include the authentication token:

```
X-ZT1-Auth: <token>
```

The token is found in the ZeroTier working directory:

- Linux: `/var/lib/zerotier-one/authtoken.secret`
- macOS: `/Library/Application Support/ZeroTier/One/authtoken.secret`
- Windows: `C:\ProgramData\ZeroTier\One\authtoken.secret`

---

## Controller Endpoints

### GET /controller

Get controller status.

**Response** `200 OK`

```json
{
  "controller": true,
  "apiVersion": 4,
  "clock": 1679000000000,
  "databaseReady": true
}
```

| Field           | Type    | Description                            |
| --------------- | ------- | -------------------------------------- |
| `controller`    | boolean | Always `true` if controller is present |
| `apiVersion`    | integer | Controller API version                 |
| `clock`         | integer | Current time in microseconds           |
| `databaseReady` | boolean | Whether the member database is ready   |

**Error Codes**: `503` if database not ready

---

### GET /controller/network

List all network IDs.

**Response** `200 OK`

```json
["8056c2e21c000001", "fedcba1234567890"]
```

Returns an array of 16-digit hexadecimal network IDs.

---

### GET /unstable/controller/network

List all networks with metadata (unstable API, ZT 1.14+).

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "8056c2e21c000001",
      "name": "my-network",
      "meta": {
        "totalMemberCount": 5,
        "authorizedMemberCount": 3
      }
    }
  ],
  "meta": {
    "networkCount": 1
  }
}
```

---

### POST /controller/network

Create a new network. The controller auto-generates the network ID.

**Request Body** (all fields optional)

```json
{
  "name": "my-network",
  "private": true,
  "enableBroadcast": true,
  "multicastLimit": 32,
  "v4AssignMode": { "zt": true },
  "v6AssignMode": { "6plane": false, "rfc4193": false, "zt": false },
  "routes": [{ "target": "10.0.0.0/24", "via": null }],
  "ipAssignmentPools": [
    { "ipRangeStart": "10.0.0.1", "ipRangeEnd": "10.0.0.254" }
  ],
  "dns": {
    "domain": "example.com",
    "servers": ["10.0.0.1"]
  }
}
```

**Response** `200 OK` — Full network object with generated ID.

**Error Codes**: `503` if unable to generate unique ID

---

### GET /controller/network/{networkId}

Get full network configuration.

**Parameters**
| Name | Type | Description |
| --- | --- | --- |
| `networkId` | string | 16-digit hex network ID |

**Response** `200 OK`

```json
{
  "id": "8056c2e21c000001",
  "nwid": "8056c2e21c000001",
  "name": "my-network",
  "private": true,
  "creationTime": 1679000000000,
  "revision": 5,
  "multicastLimit": 32,
  "enableBroadcast": true,
  "v4AssignMode": { "zt": true },
  "v6AssignMode": { "6plane": false, "rfc4193": false, "zt": false },
  "routes": [],
  "ipAssignmentPools": [],
  "rules": [{ "type": "ACTION_ACCEPT" }],
  "dns": { "domain": "", "servers": [] },
  "tags": [],
  "capabilities": [],
  "remoteTraceTarget": "",
  "remoteTraceLevel": 0,
  "objtype": "network"
}
```

**Error Codes**: `404` if network not found

---

### POST /controller/network/{networkId}

Update network configuration. Only provided fields are changed.

**Parameters**
| Name | Type | Description |
| --- | --- | --- |
| `networkId` | string | 16-digit hex network ID |

**Request Body** (all fields optional)

```json
{
  "name": "updated-name",
  "private": false,
  "routes": [{ "target": "10.0.0.0/24", "via": "10.0.0.1" }],
  "remoteTraceTarget": "1234567890",
  "remoteTraceLevel": 1
}
```

**Response** `200 OK` — Updated network object.

**Error Codes**: `404` if network not found

---

### DELETE /controller/network/{networkId}

Delete a network and all its members.

**Parameters**
| Name | Type | Description |
| --- | --- | --- |
| `networkId` | string | 16-digit hex network ID |

**Response** `200 OK` — The deleted network object.

**Error Codes**: `404` if network not found

---

### GET /controller/network/{networkId}/member

List all members of a network.

**Parameters**
| Name | Type | Description |
| --- | --- | --- |
| `networkId` | string | 16-digit hex network ID |

**Response** `200 OK`

```json
{
  "0123456789": 42,
  "fedcba9876": 15
}
```

Returns object with member IDs as keys and revision numbers as values.

**Error Codes**: `404` if network not found

---

### GET /unstable/controller/network/{networkId}/member

List all members with full details (unstable API, ZT 1.14+).

**Parameters**
| Name | Type | Description |
| --- | --- | --- |
| `networkId` | string | 16-digit hex network ID |

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "0123456789",
      "nwid": "8056c2e21c000001",
      "authorized": true,
      "activeBridge": false,
      "name": "my-device",
      "revision": 42,
      "ipAssignments": ["10.0.0.100"]
    }
  ],
  "meta": {
    "totalCount": 1,
    "authorizedCount": 1
  }
}
```

**Error Codes**: `404` if network not found

---

### GET /controller/network/{networkId}/member/{memberId}

Get specific member configuration.

**Parameters**
| Name | Type | Description |
| --- | --- | --- |
| `networkId` | string | 16-digit hex network ID |
| `memberId` | string | 10-digit hex member ID |

**Response** `200 OK`

```json
{
  "id": "0123456789",
  "nwid": "8056c2e21c000001",
  "nodeId": "0123456789",
  "name": "my-device",
  "authorized": true,
  "activeBridge": false,
  "noAutoAssignIps": false,
  "ipAssignments": ["10.0.0.100"],
  "revision": 42,
  "creationTime": 1679000000000,
  "lastAuthorizedTime": 1679000000000,
  "lastDeauthorizedTime": 0,
  "authenticationExpiryTime": 0,
  "remoteTraceTarget": "",
  "remoteTraceLevel": 0,
  "objtype": "member"
}
```

**Error Codes**: `404` if network or member not found

---

### POST /controller/network/{networkId}/member/{memberId}

Update member configuration.

**Parameters**
| Name | Type | Description |
| --- | --- | --- |
| `networkId` | string | 16-digit hex network ID |
| `memberId` | string | 10-digit hex member ID |

**Request Body** (all fields optional)

```json
{
  "authorized": true,
  "activeBridge": false,
  "noAutoAssignIps": false,
  "name": "new-name",
  "ipAssignments": ["10.0.0.100", "10.0.0.101"],
  "authenticationExpiryTime": 0,
  "remoteTraceTarget": "",
  "remoteTraceLevel": 0
}
```

| Field                      | Type     | Description                             |
| -------------------------- | -------- | --------------------------------------- |
| `authorized`               | boolean  | Grant or revoke network access          |
| `activeBridge`             | boolean  | Allow bridging to physical networks     |
| `noAutoAssignIps`          | boolean  | Disable automatic IP assignment         |
| `name`                     | string   | Descriptive name for the member         |
| `ipAssignments`            | string[] | Manually assigned IP addresses          |
| `authenticationExpiryTime` | integer  | Auth expiry (ms since epoch), 0 = never |
| `remoteTraceTarget`        | string   | 10-digit address for remote tracing     |
| `remoteTraceLevel`         | integer  | Trace level (0-255)                     |

**Response** `200 OK` — Updated member object.

**Error Codes**: `404` if network not found

---

## Node Endpoints

### GET /status

Get local node status.

**Response** `200 OK`

```json
{
  "address": "a1b2c3d4e5",
  "publicIdentity": "...",
  "worldId": 149604618,
  "worldTimestamp": 1679000000000,
  "online": true,
  "tcpFallbackActive": false,
  "versionMajor": 1,
  "versionMinor": 14,
  "versionRev": 0,
  "version": "1.14.0",
  "clock": 1679000000000,
  "config": {
    "settings": {
      "allowTcpFallbackRelay": true,
      "portMappingEnabled": true,
      "primaryPort": 9993,
      "softwareUpdate": "apply",
      "softwareUpdateChannel": "release"
    }
  }
}
```

---

### GET /peer

List all known peers.

**Response** `200 OK`

```json
[
  {
    "address": "f1e2d3c4b5",
    "versionMajor": 1,
    "versionMinor": 14,
    "versionRev": 0,
    "version": "1.14.0",
    "latency": 12,
    "role": "LEAF",
    "paths": [
      {
        "active": true,
        "address": "192.168.1.100/9993",
        "expired": false,
        "lastReceive": 1679000000000,
        "lastSend": 1679000000000,
        "preferred": true,
        "trustedPathId": 0
      }
    ]
  }
]
```

| Role       | Description               |
| ---------- | ------------------------- |
| `LEAF`     | Regular network member    |
| `UPSTREAM` | Federation upstream       |
| `ROOT`     | Root server (planet/moon) |

---

### GET /peer/{address}

Get a specific peer's details.

**Parameters**
| Name | Type | Description |
| --- | --- | --- |
| `address` | string | 10-digit hex ZeroTier address |

**Response** `200 OK` — Same structure as individual peer in list above.

---

## Error Response Format

All error responses return JSON:

```json
{
  "message": "Description of the error"
}
```

| Status Code | Meaning                                 |
| ----------- | --------------------------------------- |
| `200`       | Success                                 |
| `400`       | Invalid request                         |
| `401`       | Unauthorized (missing or invalid token) |
| `404`       | Resource not found                      |
| `503`       | Service unavailable                     |
