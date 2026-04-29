/** Controller status response */
export interface ControllerStatus {
    controller: boolean;
    apiVersion: number;
    clock: number;
    databaseReady: boolean;
}

/** Network configuration */
export interface Network {
    id: string;
    nwid: string;
    name: string;
    private: boolean;
    creationTime: number;
    revision: number;
    multicastLimit: number;
    enableBroadcast: boolean;
    v4AssignMode: V4AssignMode;
    v6AssignMode: V6AssignMode;
    routes: Route[];
    ipAssignmentPools: IpAssignmentPool[];
    rules: Rule[];
    dns: DnsConfig;
    tags: Tag[];
    capabilities: Capability[];
    remoteTraceTarget: string;
    remoteTraceLevel: number;
    objtype: string;
    totalMemberCount?: number;
    authorizedMemberCount?: number;
}

export interface V4AssignMode {
    zt: boolean;
}

export interface V6AssignMode {
    '6plane': boolean;
    rfc4193: boolean;
    zt: boolean;
}

export interface Route {
    target: string;
    via: string | null;
    flags: number;
    metric: number;
}

export interface IpAssignmentPool {
    ipRangeStart: string;
    ipRangeEnd: string;
}

export interface Rule {
    type: string;
    not?: boolean;
    or?: boolean;
    [key: string]: unknown;
}

export interface DnsConfig {
    domain: string;
    servers: string[];
}

export interface Tag {
    id: number;
    default: number;
}

export interface Capability {
    id: number;
    rules: Rule[];
}

/** Network creation payload */
export interface NetworkCreate {
    name?: string;
    private?: boolean;
    enableBroadcast?: boolean;
    multicastLimit?: number;
    v4AssignMode?: V4AssignMode;
    v6AssignMode?: V6AssignMode;
    routes?: Route[];
    ipAssignmentPools?: IpAssignmentPool[];
    dns?: DnsConfig;
    rules?: Rule[];
}

/** Network update payload */
export interface NetworkUpdate extends NetworkCreate {
    remoteTraceTarget?: string;
    remoteTraceLevel?: number;
}

/** Member configuration */
export interface Member {
    id: string;
    nwid: string;
    nodeId: string;
    name: string;
    authorized: boolean;
    activeBridge: boolean;
    noAutoAssignIps: boolean;
    ipAssignments: string[];
    revision: number;
    creationTime: number;
    lastAuthorizedTime: number;
    lastDeauthorizedTime: number;
    authenticationExpiryTime: number;
    remoteTraceTarget: string;
    remoteTraceLevel: number;
    objtype: string;
}

/** Member update payload */
export interface MemberUpdate {
    authorized?: boolean;
    activeBridge?: boolean;
    noAutoAssignIps?: boolean;
    name?: string;
    ipAssignments?: string[];
    authenticationExpiryTime?: number;
    remoteTraceTarget?: string;
    remoteTraceLevel?: number;
}

/** Node status response */
export interface NodeStatus {
    address: string;
    publicIdentity: string;
    worldId: number;
    worldTimestamp: number;
    online: boolean;
    tcpFallbackActive: boolean;
    versionMajor: number;
    versionMinor: number;
    versionRev: number;
    version: string;
    clock: number;
    config: NodeConfig;
}

export interface NodeConfig {
    settings: NodeSettings;
}

export interface NodeSettings {
    allowTcpFallbackRelay: boolean;
    portMappingEnabled: boolean;
    primaryPort: number;
    softwareUpdate: string;
    softwareUpdateChannel: string;
}

/** Peer information */
export interface Peer {
    address: string;
    versionMajor: number;
    versionMinor: number;
    versionRev: number;
    version: string;
    latency: number;
    role: 'LEAF' | 'UPSTREAM' | 'ROOT';
    paths: PeerPath[];
}

export interface PeerPath {
    active: boolean;
    address: string;
    expired: boolean;
    lastReceive: number;
    lastSend: number;
    preferred: boolean;
    trustedPathId: number;
}

/** Unstable API - network list item */
export interface NetworkListItem {
    id: string;
    name: string;
    meta: {
        totalMemberCount: number;
        authorizedMemberCount: number;
    };
}

/** Unstable API - network list response */
export interface NetworkListResponse {
    data: NetworkListItem[];
    meta: {
        networkCount: number;
    };
}

/** Unstable API - member list response */
export interface MemberListResponse {
    data: Member[];
    meta: {
        totalCount: number;
        authorizedCount: number;
    };
}

/** API error */
export interface ApiError {
    status: number;
    message: string;
    /** Raw parsed JSON response body, when available. Lets callers read structured fields like { reason, invalidIp }. */
    body?: unknown;
}

/** Application configuration (theme preference only — ZT token is server-side) */
export interface AppConfig {
    theme: 'dark' | 'light' | 'system';
}

/** Log entry for UI display */
export interface LogEntry {
    id: string;
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    details?: string;
}
