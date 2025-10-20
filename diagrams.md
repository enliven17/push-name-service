# Push Universal Name Service - System Architecture Diagrams

This document presents the architecture of the Push Universal Name Service system using Mermaid diagrams.

## 1. Overall System Architecture

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        UI[User Interface]
        WC[Wallet Connection]
        NS[Name Service Components]
        MS[Marketplace Components]
        TF[Transfer Components]
    end
    
    subgraph "Blockchain Networks"
        subgraph "Ethereum Sepolia"
            EB[EthBridge Contract]
            ETH[ETH Payments]
        end
        
        subgraph "Push Chain Donut"
            PNS[Push Name Service Contract]
            US[Universal Signer]
            PC[PC Tokens]
        end
    end
    
    subgraph "Backend Services"
        API[Gasless API]
        DB[(Supabase Database)]
        UP[Universal Processor]
    end
    
    UI --> WC
    WC --> NS
    NS --> EB
    NS --> PNS
    EB --> API
    API --> US
    US --> PNS
    PNS --> DB
    MS --> PNS
    TF --> PNS
    TF --> EB
```

## 2. Domain Registration Flow

### 2.1 Direct Registration (Push Chain)

```mermaid
sequenceDiagram
    participant U as User
    participant W as Wallet
    participant PC as Push Chain
    participant PNS as Name Service Contract
    participant DB as Database
    
    U->>W: Connect Wallet
    U->>PC: Switch to Push Chain
    U->>PNS: Register Domain (Pay PC)
    PNS->>PNS: Mint Domain NFT
    PNS->>U: Return Transaction Hash
    U->>DB: Save Domain Info
    U->>U: Show Success Modal
```

### 2.2 Gasless Registration (Ethereum Sepolia)

```mermaid
sequenceDiagram
    participant U as User
    participant W as Wallet
    participant ES as Ethereum Sepolia
    participant EB as EthBridge
    participant API as Gasless API
    participant US as Universal Signer
    participant PC as Push Chain
    participant PNS as Name Service Contract
    participant DB as Database
    
    U->>W: Connect Wallet
    U->>ES: Switch to Ethereum Sepolia
    U->>EB: Pay Registration Fee (0.001 ETH)
    EB->>EB: Store Payment Request
    U->>W: Sign Registration Message
    U->>API: Submit Gasless Request
    API->>US: Initialize Universal Signer
    US->>PC: Execute Registration on Push Chain
    PC->>PNS: Register Domain (Pay PC)
    PNS->>PNS: Mint Domain NFT
    PNS->>API: Return Transaction Hash
    API->>DB: Save Domain Info
    API->>U: Return Success Response
    U->>U: Show Success Modal (Both TX Hashes)
```

## 3. Universal Bridge System

```mermaid
graph LR
    subgraph "User Actions"
        REG[Registration]
        TRF[Transfer]
        LIST[Listing]
    end
    
    subgraph "Network Detection"
        ETH[Ethereum Sepolia]
        PUSH[Push Chain]
    end
    
    subgraph "Execution Paths"
        subgraph "Ethereum Sepolia Path"
            EB[EthBridge Contract]
            FEE[Pay ETH Fee]
            REQ[Create Request]
        end
        
        subgraph "Push Chain Path"
            DIR[Direct Execution]
            GAS[Pay Gas in PC]
        end
        
        subgraph "Universal Processing"
            US[Universal Signer]
            EXEC[Execute on Push Chain]
        end
    end
    
    REG --> ETH
    REG --> PUSH
    TRF --> ETH
    TRF --> PUSH
    LIST --> ETH
    LIST --> PUSH
    
    ETH --> EB
    EB --> FEE
    FEE --> REQ
    REQ --> US
    US --> EXEC
    
    PUSH --> DIR
    DIR --> GAS
    GAS --> EXEC
```

## 4. Domain Transfer System

```mermaid
flowchart TD
    START[User Initiates Transfer] --> DETECT{Detect Network}
    
    DETECT -->|Push Chain| DIRECT[Direct Transfer]
    DETECT -->|Ethereum Sepolia| BRIDGE[Bridge Transfer]
    
    DIRECT --> PUSHFEE[Pay 0.0001 PC]
    PUSHFEE --> PUSHTX[Execute Transfer on Push Chain]
    PUSHTX --> PUSHSUCCESS[Transfer Complete]
    
    BRIDGE --> ETHFEE[Pay 0.0002 ETH]
    ETHFEE --> ETHREQ[Create Transfer Request]
    ETHREQ --> UNIVERSAL[Universal Signer Processing]
    UNIVERSAL --> PUSHTX
    
    PUSHSUCCESS --> UPDATE[Update Database]
    UPDATE --> MODAL[Show Success Modal]
```

## 5. Marketplace Listing System

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend
    participant NET as Network Detection
    participant EB as EthBridge (Sepolia)
    participant PNS as Push Name Service (Push Chain)
    participant DB as Database
    participant US as Universal Signer
    
    U->>UI: Create Listing
    UI->>NET: Detect Current Network
    
    alt Ethereum Sepolia
        NET->>EB: Pay Listing Fee (0.0002 ETH)
        EB->>US: Trigger Universal Signer
        US->>PNS: Execute Listing on Push Chain
    else Push Chain
        NET->>PNS: Direct Listing (No Fee)
    end
    
    PNS->>DB: Save Listing Info
    DB->>UI: Return Success
    UI->>U: Show Success Modal
```

## 6. Universal Signer Architecture

```mermaid
graph TB
    subgraph "Universal Signer Service"
        US[Universal Signer Core]
        PC[Push Chain Client]
        UE[Universal Executor]
        VP[Verification Precompile]
    end
    
    subgraph "Input Sources"
        ES[Ethereum Sepolia Requests]
        API[Gasless API Calls]
        EB[EthBridge Events]
    end
    
    subgraph "Push Chain Execution"
        PNS[Name Service Contract]
        MP[Marketplace Contract]
        TF[Transfer Functions]
    end
    
    subgraph "Operations"
        REG[Domain Registration]
        TRANS[Domain Transfer]
        LIST[Marketplace Listing]
    end
    
    ES --> US
    API --> US
    EB --> US
    
    US --> PC
    PC --> UE
    UE --> VP
    
    VP --> PNS
    VP --> MP
    VP --> TF
    
    PNS --> REG
    MP --> LIST
    TF --> TRANS
```

## 7. Database Schema Relations

```mermaid
erDiagram
    DOMAINS {
        uuid id PK
        string name
        string owner_address
        timestamp created_at
        timestamp expiration_date
        string transaction_hash
        boolean is_universal
        string chain_id
    }
    
    MARKETPLACE_LISTINGS {
        uuid id PK
        uuid domain_id FK
        string seller_address
        string price
        string currency
        string status
        timestamp created_at
        string listing_transaction_hash
        string chain_id
    }
    
    TRANSFER_HISTORY {
        uuid id PK
        uuid domain_id FK
        string from_address
        string to_address
        timestamp transfer_date
        string transaction_hash
        string chain_id
    }
    
    GASLESS_REQUESTS {
        uuid id PK
        string request_id
        string domain_name
        string user_address
        string status
        string eth_tx_hash
        string push_tx_hash
        timestamp created_at
    }
    
    DOMAINS ||--o{ MARKETPLACE_LISTINGS : "can be listed"
    DOMAINS ||--o{ TRANSFER_HISTORY : "has transfers"
    DOMAINS ||--o{ GASLESS_REQUESTS : "can be registered gasless"
```

## 8. Component Architecture

```mermaid
graph TB
    subgraph "Main Application"
        APP[App.tsx]
        PAGE[page.tsx]
    end
    
    subgraph "Core Components"
        PNS[PushNameService.tsx]
        REG[Registration Components]
        SEARCH[Domain Search]
    end
    
    subgraph "Transfer System"
        DT[DomainTransfer.tsx]
        CCT[CrossChainTransfer.tsx]
        PROG[GaslessProgress.tsx]
    end
    
    subgraph "Marketplace"
        ML[MarketplaceListings.tsx]
        CLM[CreateListingModal.tsx]
        BADGE[Universal Badge]
    end
    
    subgraph "Success & Notifications"
        RSM[RegistrationSuccessModal.tsx]
        NOTIF[Notification System]
        CONF[ConfirmationModal.tsx]
    end
    
    subgraph "Hooks & Services"
        UGR[useGaslessRegistration.ts]
        US[universalSigner.ts]
        PP[pushProtocol.ts]
        SUP[supabase.ts]
    end
    
    APP --> PAGE
    PAGE --> PNS
    PAGE --> DT
    PAGE --> ML
    
    PNS --> REG
    PNS --> SEARCH
    
    DT --> CCT
    REG --> PROG
    REG --> UGR
    
    ML --> CLM
    ML --> BADGE
    
    UGR --> US
    US --> PP
    
    REG --> RSM
    DT --> RSM
    ML --> RSM
    
    RSM --> NOTIF
    PAGE --> CONF
```

## 9. Network Flow & Chain Interactions

```mermaid
graph LR
    subgraph "User Wallet"
        MM[MetaMask]
        WC[WalletConnect]
        RK[RainbowKit]
    end
    
    subgraph "Supported Networks"
        subgraph "Ethereum Sepolia (11155111)"
            ES_RPC[RPC: 1rpc.io/sepolia]
            ES_EB[EthBridge Contract]
            ES_EXP[Explorer: sepolia.etherscan.io]
        end
        
        subgraph "Push Chain Donut (42101)"
            PC_RPC[RPC: evm.rpc-testnet-donut-node1.push.org]
            PC_PNS[Push Name Service Contract]
            PC_EXP[Explorer: donut.push.network]
        end
    end
    
    subgraph "Universal Bridge"
        UB[Universal Bridge Logic]
        US[Universal Signer Service]
        API[Gasless API Endpoint]
    end
    
    MM --> ES_RPC
    MM --> PC_RPC
    WC --> ES_RPC
    WC --> PC_RPC
    RK --> ES_RPC
    RK --> PC_RPC
    
    ES_EB --> UB
    UB --> US
    US --> API
    API --> PC_PNS
    
    ES_EXP --> ES_EB
    PC_EXP --> PC_PNS
```

## 10. Fee Structure & Economics

```mermaid
graph TB
    subgraph "Fee Types"
        REG_FEE[Registration Fee]
        TRANS_FEE[Transfer Fee]
        LIST_FEE[Listing Fee]
        GAS_FEE[Gas Fees]
    end
    
    subgraph "Ethereum Sepolia Fees"
        ES_REG[0.001 ETH - Registration]
        ES_TRANS[0.0002 ETH - Transfer]
        ES_LIST[0.0002 ETH - Listing]
        ES_GAS[User Pays Gas]
    end
    
    subgraph "Push Chain Fees"
        PC_REG[1.0 PC - Registration]
        PC_TRANS[0.0001 PC - Transfer]
        PC_LIST[Free - Listing]
        PC_GAS[Very Low Gas]
    end
    
    subgraph "Universal Processing"
        BRIDGE[Bridge Processing]
        RELAYER[Relayer Service]
        TREASURY[Treasury Collection]
    end
    
    REG_FEE --> ES_REG
    REG_FEE --> PC_REG
    TRANS_FEE --> ES_TRANS
    TRANS_FEE --> PC_TRANS
    LIST_FEE --> ES_LIST
    LIST_FEE --> PC_LIST
    
    ES_REG --> BRIDGE
    ES_TRANS --> BRIDGE
    ES_LIST --> BRIDGE
    
    BRIDGE --> RELAYER
    RELAYER --> TREASURY
    TREASURY --> PC_REG
    TREASURY --> PC_TRANS
```

## 11. User Journey Flow

```mermaid
journey
    title User Experience Journey
    section Domain Discovery
      Search Domain: 5: User
      Check Availability: 4: User, System
      View Pricing: 3: User, System
    section Registration Process
      Connect Wallet: 4: User
      Choose Network: 3: User
      Pay Fee: 2: User
      Sign Transaction: 3: User
      Wait Confirmation: 2: User, System
      View Success: 5: User
    section Domain Management
      View My Domains: 5: User
      Transfer Domain: 4: User
      List on Marketplace: 4: User
      Update Records: 3: User
    section Marketplace
      Browse Listings: 4: User
      Purchase Domain: 3: User
      Manage Listings: 4: User
```

## 12. Error Handling & Recovery

```mermaid
flowchart TD
    START[User Action] --> VALIDATE{Validate Input}
    VALIDATE -->|Invalid| ERROR1[Show Input Error]
    VALIDATE -->|Valid| NETWORK{Check Network}
    
    NETWORK -->|Unsupported| ERROR2[Network Error]
    NETWORK -->|Supported| WALLET{Check Wallet}
    
    WALLET -->|Not Connected| ERROR3[Connection Error]
    WALLET -->|Connected| BALANCE{Check Balance}
    
    BALANCE -->|Insufficient| ERROR4[Balance Error]
    BALANCE -->|Sufficient| EXECUTE[Execute Transaction]
    
    EXECUTE --> PENDING{Transaction Status}
    PENDING -->|Failed| ERROR5[Transaction Error]
    PENDING -->|Success| SUCCESS[Show Success]
    PENDING -->|Pending| WAIT[Wait & Retry]
    
    ERROR1 --> RETRY1[Allow Retry]
    ERROR2 --> SWITCH[Suggest Network Switch]
    ERROR3 --> CONNECT[Prompt Connection]
    ERROR4 --> FUND[Show Funding Options]
    ERROR5 --> RETRY2[Allow Retry]
    
    WAIT --> PENDING
    RETRY1 --> VALIDATE
    RETRY2 --> EXECUTE
```

## Notes

- **Universal Signer**: Executes requests from Ethereum Sepolia on Push Chain
- **EthBridge**: Fee collection and request management on Ethereum Sepolia  
- **Gasless Registration**: User only pays domain fee, no gas fees required
- **Cross-Network Support**: Same domain can be used on both Ethereum and Push Chain
- **Explorer Integration**: Appropriate explorer links shown for each transaction
- **Database Sync**: All operations are synchronized in Supabase
- **Error Recovery**: Comprehensive error handling with retry mechanisms
- **User Experience**: Seamless flow across different networks and operations