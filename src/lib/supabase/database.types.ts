
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "account_deletion_requests": {
                  Row: {
                    "created_at": string,"id": string,"processed_at": string | null,"profile_id": string,"reason": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"processed_at"?: string | null,"profile_id": string,"reason"?: string | null,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"processed_at"?: string | null,"profile_id"?: string,"reason"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_deletion_requests_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_analysis_records": {
                  Row: {
                    "created_at": string,"entity_id": string | null,"entity_type": string | null,"error_code": string | null,"id": string,"input_tokens": number | null,"kind": string,"latency_ms": number | null,"model": string | null,"output": Json | null,"output_tokens": number | null,"profile_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"error_code"?: string | null,"id"?: string,"input_tokens"?: number | null,"kind": string,"latency_ms"?: number | null,"model"?: string | null,"output"?: Json | null,"output_tokens"?: number | null,"profile_id": string,"status": string
                  }
                  Update: {
                    "created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"error_code"?: string | null,"id"?: string,"input_tokens"?: number | null,"kind"?: string,"latency_ms"?: number | null,"model"?: string | null,"output"?: Json | null,"output_tokens"?: number | null,"profile_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_analysis_records_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"campaign_id": string | null,"created_at": string,"entity_id": string | null,"entity_type": string,"id": number,"metadata": NonNullable<Json>,"project_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"campaign_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: never,"metadata"?: NonNullable<Json>,"project_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"campaign_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: never,"metadata"?: NonNullable<Json>,"project_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_logs_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_logs_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"brand_contacts": {
                  Row: {
                    "brand_id": string,"contact_email": string | null,"contact_name": string | null,"contact_phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brand_id": string,"contact_email"?: string | null,"contact_name"?: string | null,"contact_phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "brand_id"?: string,"contact_email"?: string | null,"contact_name"?: string | null,"contact_phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "brand_contacts_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: true
      referencedRelation: "brand_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"brand_profiles": {
                  Row: {
                    "brand_name": string,"created_at": string,"description": string | null,"id": string,"industry_id": number | null,"location_country": string | null,"logo_path": string | null,"onboarding_step": number,"slug": string,"team_size": string | null,"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand_name": string,"created_at"?: string,"description"?: string | null,"id": string,"industry_id"?: number | null,"location_country"?: string | null,"logo_path"?: string | null,"onboarding_step"?: number,"slug": string,"team_size"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "brand_name"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"industry_id"?: number | null,"location_country"?: string | null,"logo_path"?: string | null,"onboarding_step"?: number,"slug"?: string,"team_size"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "brand_profiles_id_fkey"
      columns: ["id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "brand_profiles_industry_id_fkey"
      columns: ["industry_id"]
isOneToOne: false
      referencedRelation: "industries"
      referencedColumns: ["id"]
    }
                  ]
                },"campaign_deliverables": {
                  Row: {
                    "campaign_id": string,"created_at": string,"deliverable_type_id": number,"description": string | null,"id": string,"platform_id": number | null,"quantity": number,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign_id": string,"created_at"?: string,"deliverable_type_id": number,"description"?: string | null,"id"?: string,"platform_id"?: number | null,"quantity"?: number,"sort_order"?: number
                  }
                  Update: {
                    "campaign_id"?: string,"created_at"?: string,"deliverable_type_id"?: number,"description"?: string | null,"id"?: string,"platform_id"?: number | null,"quantity"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaign_deliverables_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_deliverables_deliverable_type_id_fkey"
      columns: ["deliverable_type_id"]
isOneToOne: false
      referencedRelation: "deliverable_types"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_deliverables_platform_id_fkey"
      columns: ["platform_id"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["id"]
    }
                  ]
                },"campaign_invitations": {
                  Row: {
                    "campaign_id": string,"created_at": string,"creator_id": string,"id": string,"invited_by": string,"message": string | null,"responded_at": string | null,"squad_role_id": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign_id": string,"created_at"?: string,"creator_id": string,"id"?: string,"invited_by": string,"message"?: string | null,"responded_at"?: string | null,"squad_role_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "campaign_id"?: string,"created_at"?: string,"creator_id"?: string,"id"?: string,"invited_by"?: string,"message"?: string | null,"responded_at"?: string | null,"squad_role_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaign_invitations_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_invitations_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_invitations_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_invitations_squad_role_id_fkey"
      columns: ["squad_role_id"]
isOneToOne: false
      referencedRelation: "squad_roles"
      referencedColumns: ["id"]
    }
                  ]
                },"campaign_platforms": {
                  Row: {
                    "campaign_id": string,"platform_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign_id": string,"platform_id": number
                  }
                  Update: {
                    "campaign_id"?: string,"platform_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaign_platforms_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_platforms_platform_id_fkey"
      columns: ["platform_id"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["id"]
    }
                  ]
                },"campaign_skills": {
                  Row: {
                    "campaign_id": string,"skill_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign_id": string,"skill_id": number
                  }
                  Update: {
                    "campaign_id"?: string,"skill_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaign_skills_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"campaign_style_tags": {
                  Row: {
                    "campaign_id": string,"style_tag_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign_id": string,"style_tag_id": number
                  }
                  Update: {
                    "campaign_id"?: string,"style_tag_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaign_style_tags_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_style_tags_style_tag_id_fkey"
      columns: ["style_tag_id"]
isOneToOne: false
      referencedRelation: "creative_style_tags"
      referencedColumns: ["id"]
    }
                  ]
                },"campaigns": {
                  Row: {
                    "ai_assisted": boolean,"application_deadline": string | null,"blind_review": boolean,"brand_id": string,"budget_max_cents": number | null,"budget_min_cents": number | null,"category_id": number | null,"closed_at": string | null,"created_at": string,"currency": string,"deadline": string | null,"description": string | null,"exclusivity_required": boolean,"id": string,"industry_id": number | null,"location_requirement": string | null,"objective": string | null,"product_description": string | null,"published_at": string | null,"raw_files_required": boolean,"revisions_expected": number | null,"search_vector": unknown,"status": string,"target_audience": string | null,"title": string,"updated_at": string,"usage_duration_months": number | null,"usage_notes": string | null,"usage_organic": boolean,"usage_paid_ads": boolean,"usage_territory": string | null,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_assisted"?: boolean,"application_deadline"?: string | null,"blind_review"?: boolean,"brand_id": string,"budget_max_cents"?: number | null,"budget_min_cents"?: number | null,"category_id"?: number | null,"closed_at"?: string | null,"created_at"?: string,"currency"?: string,"deadline"?: string | null,"description"?: string | null,"exclusivity_required"?: boolean,"id"?: string,"industry_id"?: number | null,"location_requirement"?: string | null,"objective"?: string | null,"product_description"?: string | null,"published_at"?: string | null,"raw_files_required"?: boolean,"revisions_expected"?: number | null,"search_vector"?: never,"status"?: string,"target_audience"?: string | null,"title": string,"updated_at"?: string,"usage_duration_months"?: number | null,"usage_notes"?: string | null,"usage_organic"?: boolean,"usage_paid_ads"?: boolean,"usage_territory"?: string | null,"visibility"?: string
                  }
                  Update: {
                    "ai_assisted"?: boolean,"application_deadline"?: string | null,"blind_review"?: boolean,"brand_id"?: string,"budget_max_cents"?: number | null,"budget_min_cents"?: number | null,"category_id"?: number | null,"closed_at"?: string | null,"created_at"?: string,"currency"?: string,"deadline"?: string | null,"description"?: string | null,"exclusivity_required"?: boolean,"id"?: string,"industry_id"?: number | null,"location_requirement"?: string | null,"objective"?: string | null,"product_description"?: string | null,"published_at"?: string | null,"raw_files_required"?: boolean,"revisions_expected"?: number | null,"search_vector"?: never,"status"?: string,"target_audience"?: string | null,"title"?: string,"updated_at"?: string,"usage_duration_months"?: number | null,"usage_notes"?: string | null,"usage_organic"?: boolean,"usage_paid_ads"?: boolean,"usage_territory"?: string | null,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaigns_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brand_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaigns_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "creator_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaigns_industry_id_fkey"
      columns: ["industry_id"]
isOneToOne: false
      referencedRelation: "industries"
      referencedColumns: ["id"]
    }
                  ]
                },"conversation_members": {
                  Row: {
                    "conversation_id": string,"created_at": string,"last_read_at": string | null,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"created_at"?: string,"last_read_at"?: string | null,"profile_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"created_at"?: string,"last_read_at"?: string | null,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_members_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "campaign_id": string | null,"created_at": string,"id": string,"last_message_at": string | null,"project_id": string | null,"proposal_id": string | null,"subject": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign_id"?: string | null,"created_at"?: string,"id"?: string,"last_message_at"?: string | null,"project_id"?: string | null,"proposal_id"?: string | null,"subject"?: string | null
                  }
                  Update: {
                    "campaign_id"?: string | null,"created_at"?: string,"id"?: string,"last_message_at"?: string | null,"project_id"?: string | null,"proposal_id"?: string | null,"subject"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "proposals"
      referencedColumns: ["id"]
    }
                  ]
                },"creative_style_tags": {
                  Row: {
                    "active": boolean,"description": string | null,"id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"description"?: string | null,"id"?: never,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"description"?: string | null,"id"?: never,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"creator_categories": {
                  Row: {
                    "active": boolean,"id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id"?: never,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"id"?: never,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"creator_category_links": {
                  Row: {
                    "category_id": number,"creator_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": number,"creator_id": string
                  }
                  Update: {
                    "category_id"?: number,"creator_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "creator_category_links_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "creator_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "creator_category_links_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"creator_platforms": {
                  Row: {
                    "creator_id": string,"handle": string | null,"platform_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "creator_id": string,"handle"?: string | null,"platform_id": number
                  }
                  Update: {
                    "creator_id"?: string,"handle"?: string | null,"platform_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "creator_platforms_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "creator_platforms_platform_id_fkey"
      columns: ["platform_id"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["id"]
    }
                  ]
                },"creator_profiles": {
                  Row: {
                    "availability": string,"available_from": string | null,"avatar_path": string | null,"bio": string | null,"collaboration_types": (string)[],"created_at": string,"currency": string,"display_name": string,"headline": string | null,"id": string,"languages": (string)[],"location_city": string | null,"location_country": string | null,"onboarding_step": number,"search_vector": unknown,"slug": string,"starting_rate_cents": number | null,"updated_at": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: string,"available_from"?: string | null,"avatar_path"?: string | null,"bio"?: string | null,"collaboration_types"?: (string)[],"created_at"?: string,"currency"?: string,"display_name": string,"headline"?: string | null,"id": string,"languages"?: (string)[],"location_city"?: string | null,"location_country"?: string | null,"onboarding_step"?: number,"search_vector"?: never,"slug": string,"starting_rate_cents"?: number | null,"updated_at"?: string,"visibility"?: string
                  }
                  Update: {
                    "availability"?: string,"available_from"?: string | null,"avatar_path"?: string | null,"bio"?: string | null,"collaboration_types"?: (string)[],"created_at"?: string,"currency"?: string,"display_name"?: string,"headline"?: string | null,"id"?: string,"languages"?: (string)[],"location_city"?: string | null,"location_country"?: string | null,"onboarding_step"?: number,"search_vector"?: never,"slug"?: string,"starting_rate_cents"?: number | null,"updated_at"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "creator_profiles_id_fkey"
      columns: ["id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"creator_services": {
                  Row: {
                    "active": boolean,"created_at": string,"creator_id": string,"currency": string,"deliverable_type_id": number | null,"description": string | null,"id": string,"revisions_included": number | null,"starting_price_cents": number | null,"title": string,"turnaround_days": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"creator_id": string,"currency"?: string,"deliverable_type_id"?: number | null,"description"?: string | null,"id"?: string,"revisions_included"?: number | null,"starting_price_cents"?: number | null,"title": string,"turnaround_days"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"creator_id"?: string,"currency"?: string,"deliverable_type_id"?: number | null,"description"?: string | null,"id"?: string,"revisions_included"?: number | null,"starting_price_cents"?: number | null,"title"?: string,"turnaround_days"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "creator_services_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "creator_services_deliverable_type_id_fkey"
      columns: ["deliverable_type_id"]
isOneToOne: false
      referencedRelation: "deliverable_types"
      referencedColumns: ["id"]
    }
                  ]
                },"creator_skills": {
                  Row: {
                    "creator_id": string,"skill_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "creator_id": string,"skill_id": number
                  }
                  Update: {
                    "creator_id"?: string,"skill_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "creator_skills_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "creator_skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"creator_style_tags": {
                  Row: {
                    "creator_id": string,"style_tag_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "creator_id": string,"style_tag_id": number
                  }
                  Update: {
                    "creator_id"?: string,"style_tag_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "creator_style_tags_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "creator_style_tags_style_tag_id_fkey"
      columns: ["style_tag_id"]
isOneToOne: false
      referencedRelation: "creative_style_tags"
      referencedColumns: ["id"]
    }
                  ]
                },"deliverable_feedback": {
                  Row: {
                    "author_id": string,"body": string | null,"created_at": string,"decision": string,"deliverable_id": string,"id": string,"version_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body"?: string | null,"created_at"?: string,"decision": string,"deliverable_id": string,"id"?: string,"version_id"?: string | null
                  }
                  Update: {
                    "author_id"?: string,"body"?: string | null,"created_at"?: string,"decision"?: string,"deliverable_id"?: string,"id"?: string,"version_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliverable_feedback_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverable_feedback_deliverable_id_fkey"
      columns: ["deliverable_id"]
isOneToOne: false
      referencedRelation: "deliverables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverable_feedback_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "deliverable_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"deliverable_types": {
                  Row: {
                    "active": boolean,"effort_units": number,"id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"effort_units"?: number,"id"?: never,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"effort_units"?: number,"id"?: never,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"deliverable_versions": {
                  Row: {
                    "created_at": string,"deliverable_id": string,"external_url": string | null,"file_name": string | null,"id": string,"mime_type": string | null,"notes": string | null,"size_bytes": number | null,"storage_path": string | null,"submitted_by": string,"version_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deliverable_id": string,"external_url"?: string | null,"file_name"?: string | null,"id"?: string,"mime_type"?: string | null,"notes"?: string | null,"size_bytes"?: number | null,"storage_path"?: string | null,"submitted_by": string,"version_number": number
                  }
                  Update: {
                    "created_at"?: string,"deliverable_id"?: string,"external_url"?: string | null,"file_name"?: string | null,"id"?: string,"mime_type"?: string | null,"notes"?: string | null,"size_bytes"?: number | null,"storage_path"?: string | null,"submitted_by"?: string,"version_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliverable_versions_deliverable_id_fkey"
      columns: ["deliverable_id"]
isOneToOne: false
      referencedRelation: "deliverables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverable_versions_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"deliverables": {
                  Row: {
                    "approved_at": string | null,"created_at": string,"created_by": string | null,"current_version": number,"deliverable_type_id": number | null,"description": string | null,"due_date": string | null,"id": string,"milestone_id": string | null,"platform_id": number | null,"project_id": string,"revision_count": number,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"current_version"?: number,"deliverable_type_id"?: number | null,"description"?: string | null,"due_date"?: string | null,"id"?: string,"milestone_id"?: string | null,"platform_id"?: number | null,"project_id": string,"revision_count"?: number,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "approved_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"current_version"?: number,"deliverable_type_id"?: number | null,"description"?: string | null,"due_date"?: string | null,"id"?: string,"milestone_id"?: string | null,"platform_id"?: number | null,"project_id"?: string,"revision_count"?: number,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliverables_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_deliverable_type_id_fkey"
      columns: ["deliverable_type_id"]
isOneToOne: false
      referencedRelation: "deliverable_types"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_milestone_id_fkey"
      columns: ["milestone_id"]
isOneToOne: false
      referencedRelation: "project_milestones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_platform_id_fkey"
      columns: ["platform_id"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"industries": {
                  Row: {
                    "active": boolean,"id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id"?: never,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"id"?: never,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"match_results": {
                  Row: {
                    "ai_explanation": string | null,"algorithm_version": string,"campaign_id": string,"computed_at": string,"creator_id": string,"explanation": string,"factors": NonNullable<Json>,"id": string,"score": number,"squad_role_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_explanation"?: string | null,"algorithm_version": string,"campaign_id": string,"computed_at"?: string,"creator_id": string,"explanation": string,"factors": NonNullable<Json>,"id"?: string,"score": number,"squad_role_id"?: string | null
                  }
                  Update: {
                    "ai_explanation"?: string | null,"algorithm_version"?: string,"campaign_id"?: string,"computed_at"?: string,"creator_id"?: string,"explanation"?: string,"factors"?: NonNullable<Json>,"id"?: string,"score"?: number,"squad_role_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_results_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_results_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_results_squad_role_id_fkey"
      columns: ["squad_role_id"]
isOneToOne: false
      referencedRelation: "squad_roles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"id": string,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"id"?: string,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"entity_id": string | null,"entity_type": string | null,"id": string,"link_path": string | null,"read_at": string | null,"recipient_id": string,"title": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"link_path"?: string | null,"read_at"?: string | null,"recipient_id": string,"title": string,"type": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"link_path"?: string | null,"read_at"?: string | null,"recipient_id"?: string,"title"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_settings": {
                  Row: {
                    "description": string | null,"key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"platforms": {
                  Row: {
                    "active": boolean,"id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id"?: never,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"id"?: never,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"portfolio_items": {
                  Row: {
                    "category_id": number | null,"client_name": string | null,"created_at": string,"creator_id": string,"deliverable_type_id": number | null,"description": string | null,"external_url": string | null,"id": string,"industry_id": number | null,"media_path": string | null,"media_type": string,"platform_id": number | null,"search_vector": unknown,"sort_order": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: number | null,"client_name"?: string | null,"created_at"?: string,"creator_id": string,"deliverable_type_id"?: number | null,"description"?: string | null,"external_url"?: string | null,"id"?: string,"industry_id"?: number | null,"media_path"?: string | null,"media_type"?: string,"platform_id"?: number | null,"search_vector"?: never,"sort_order"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: number | null,"client_name"?: string | null,"created_at"?: string,"creator_id"?: string,"deliverable_type_id"?: number | null,"description"?: string | null,"external_url"?: string | null,"id"?: string,"industry_id"?: number | null,"media_path"?: string | null,"media_type"?: string,"platform_id"?: number | null,"search_vector"?: never,"sort_order"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "portfolio_items_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "creator_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "portfolio_items_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "portfolio_items_deliverable_type_id_fkey"
      columns: ["deliverable_type_id"]
isOneToOne: false
      referencedRelation: "deliverable_types"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "portfolio_items_industry_id_fkey"
      columns: ["industry_id"]
isOneToOne: false
      referencedRelation: "industries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "portfolio_items_platform_id_fkey"
      columns: ["platform_id"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_links": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"profile_id": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"profile_id": string,"url": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"profile_id"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_links_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"full_name": string | null,"id": string,"onboarding_completed_at": string | null,"role": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"full_name"?: string | null,"id": string,"onboarding_completed_at"?: string | null,"role"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"full_name"?: string | null,"id"?: string,"onboarding_completed_at"?: string | null,"role"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"project_comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"deliverable_id": string | null,"id": string,"milestone_id": string | null,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"deliverable_id"?: string | null,"id"?: string,"milestone_id"?: string | null,"project_id": string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"deliverable_id"?: string | null,"id"?: string,"milestone_id"?: string | null,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_comments_deliverable_id_fkey"
      columns: ["deliverable_id"]
isOneToOne: false
      referencedRelation: "deliverables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_comments_milestone_id_fkey"
      columns: ["milestone_id"]
isOneToOne: false
      referencedRelation: "project_milestones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_comments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"project_members": {
                  Row: {
                    "created_at": string,"member_role": string,"profile_id": string,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"member_role": string,"profile_id": string,"project_id": string
                  }
                  Update: {
                    "created_at"?: string,"member_role"?: string,"profile_id"?: string,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_members_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"project_milestones": {
                  Row: {
                    "amount_cents": number | null,"approved_at": string | null,"created_at": string,"created_by": string | null,"description": string | null,"due_date": string | null,"id": string,"percentage": number | null,"project_id": string,"sort_order": number,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents"?: number | null,"approved_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"id"?: string,"percentage"?: number | null,"project_id": string,"sort_order"?: number,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number | null,"approved_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"id"?: string,"percentage"?: number | null,"project_id"?: string,"sort_order"?: number,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_milestones_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_milestones_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "agreed_amount_cents": number | null,"brand_agreed_at": string | null,"brand_id": string,"campaign_id": string,"cancelled_at": string | null,"completed_at": string | null,"created_at": string,"creator_agreed_at": string | null,"creator_id": string,"currency": string,"due_date": string | null,"id": string,"proposal_id": string,"scope_summary": string | null,"start_date": string | null,"status": string,"status_note": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agreed_amount_cents"?: number | null,"brand_agreed_at"?: string | null,"brand_id": string,"campaign_id": string,"cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"creator_agreed_at"?: string | null,"creator_id": string,"currency"?: string,"due_date"?: string | null,"id"?: string,"proposal_id": string,"scope_summary"?: string | null,"start_date"?: string | null,"status"?: string,"status_note"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "agreed_amount_cents"?: number | null,"brand_agreed_at"?: string | null,"brand_id"?: string,"campaign_id"?: string,"cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"creator_agreed_at"?: string | null,"creator_id"?: string,"currency"?: string,"due_date"?: string | null,"id"?: string,"proposal_id"?: string,"scope_summary"?: string | null,"start_date"?: string | null,"status"?: string,"status_note"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brand_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: true
      referencedRelation: "proposals"
      referencedColumns: ["id"]
    }
                  ]
                },"proposal_deliverables": {
                  Row: {
                    "deliverable_type_id": number,"description": string | null,"id": string,"platform_id": number | null,"price_cents": number | null,"proposal_id": string,"quantity": number,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "deliverable_type_id": number,"description"?: string | null,"id"?: string,"platform_id"?: number | null,"price_cents"?: number | null,"proposal_id": string,"quantity"?: number,"sort_order"?: number
                  }
                  Update: {
                    "deliverable_type_id"?: number,"description"?: string | null,"id"?: string,"platform_id"?: number | null,"price_cents"?: number | null,"proposal_id"?: string,"quantity"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "proposal_deliverables_deliverable_type_id_fkey"
      columns: ["deliverable_type_id"]
isOneToOne: false
      referencedRelation: "deliverable_types"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proposal_deliverables_platform_id_fkey"
      columns: ["platform_id"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proposal_deliverables_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "proposals"
      referencedColumns: ["id"]
    }
                  ]
                },"proposal_portfolio_items": {
                  Row: {
                    "portfolio_item_id": string,"proposal_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "portfolio_item_id": string,"proposal_id": string
                  }
                  Update: {
                    "portfolio_item_id"?: string,"proposal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proposal_portfolio_items_portfolio_item_id_fkey"
      columns: ["portfolio_item_id"]
isOneToOne: false
      referencedRelation: "portfolio_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proposal_portfolio_items_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "proposals"
      referencedColumns: ["id"]
    }
                  ]
                },"proposals": {
                  Row: {
                    "approach": string | null,"campaign_id": string,"created_at": string,"creator_id": string,"currency": string,"decided_at": string | null,"decision_note": string | null,"id": string,"identity_revealed": boolean,"invitation_id": string | null,"proposed_delivery_date": string | null,"quote_cents": number | null,"revisions_included": number | null,"squad_role_id": string | null,"status": string,"submitted_at": string | null,"timeline_days": number | null,"updated_at": string,"usage_notes": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "approach"?: string | null,"campaign_id": string,"created_at"?: string,"creator_id": string,"currency"?: string,"decided_at"?: string | null,"decision_note"?: string | null,"id"?: string,"identity_revealed"?: boolean,"invitation_id"?: string | null,"proposed_delivery_date"?: string | null,"quote_cents"?: number | null,"revisions_included"?: number | null,"squad_role_id"?: string | null,"status"?: string,"submitted_at"?: string | null,"timeline_days"?: number | null,"updated_at"?: string,"usage_notes"?: string | null
                  }
                  Update: {
                    "approach"?: string | null,"campaign_id"?: string,"created_at"?: string,"creator_id"?: string,"currency"?: string,"decided_at"?: string | null,"decision_note"?: string | null,"id"?: string,"identity_revealed"?: boolean,"invitation_id"?: string | null,"proposed_delivery_date"?: string | null,"quote_cents"?: number | null,"revisions_included"?: number | null,"squad_role_id"?: string | null,"status"?: string,"submitted_at"?: string | null,"timeline_days"?: number | null,"updated_at"?: string,"usage_notes"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "proposals_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proposals_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proposals_invitation_id_fkey"
      columns: ["invitation_id"]
isOneToOne: false
      referencedRelation: "campaign_invitations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proposals_squad_role_id_fkey"
      columns: ["squad_role_id"]
isOneToOne: false
      referencedRelation: "squad_roles"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"entity_id": string,"entity_type": string,"id": string,"reason": string,"reporter_id": string,"resolution_note": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"entity_id": string,"entity_type": string,"id"?: string,"reason": string,"reporter_id": string,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"entity_id"?: string,"entity_type"?: string,"id"?: string,"reason"?: string,"reporter_id"?: string,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "body": string | null,"created_at": string,"direction": string,"id": string,"project_id": string,"rating": number,"reviewee_id": string,"reviewer_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"direction": string,"id"?: string,"project_id": string,"rating": number,"reviewee_id": string,"reviewer_id": string,"status"?: string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"direction"?: string,"id"?: string,"project_id"?: string,"rating"?: number,"reviewee_id"?: string,"reviewer_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_id_fkey"
      columns: ["reviewee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rights_record_platforms": {
                  Row: {
                    "platform_id": number,"rights_record_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "platform_id": number,"rights_record_id": string
                  }
                  Update: {
                    "platform_id"?: number,"rights_record_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rights_record_platforms_platform_id_fkey"
      columns: ["platform_id"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rights_record_platforms_rights_record_id_fkey"
      columns: ["rights_record_id"]
isOneToOne: false
      referencedRelation: "rights_records"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rights_record_platforms_rights_record_id_fkey"
      columns: ["rights_record_id"]
isOneToOne: false
      referencedRelation: "rights_records_effective"
      referencedColumns: ["id"]
    }
                  ]
                },"rights_records": {
                  Row: {
                    "additional_terms": string | null,"ai_training_allowed": boolean,"attribution_details": string | null,"attribution_required": boolean,"brand_approved_at": string | null,"content_type": string | null,"created_at": string,"created_by": string | null,"creator_approved_at": string | null,"deliverable_id": string | null,"derivative_edits_allowed": boolean,"derivative_notes": string | null,"dispute_reason": string | null,"duration_months": number | null,"exclusivity": string,"exclusivity_details": string | null,"id": string,"last_edited_by": string | null,"license_end": string | null,"license_start": string | null,"organic_use": boolean,"paid_ads_notes": string | null,"paid_ads_use": boolean,"project_id": string,"raw_files_included": boolean,"raw_files_notes": string | null,"revision": number,"status": string,"territory": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "additional_terms"?: string | null,"ai_training_allowed"?: boolean,"attribution_details"?: string | null,"attribution_required"?: boolean,"brand_approved_at"?: string | null,"content_type"?: string | null,"created_at"?: string,"created_by"?: string | null,"creator_approved_at"?: string | null,"deliverable_id"?: string | null,"derivative_edits_allowed"?: boolean,"derivative_notes"?: string | null,"dispute_reason"?: string | null,"duration_months"?: number | null,"exclusivity"?: string,"exclusivity_details"?: string | null,"id"?: string,"last_edited_by"?: string | null,"license_end"?: string | null,"license_start"?: string | null,"organic_use"?: boolean,"paid_ads_notes"?: string | null,"paid_ads_use"?: boolean,"project_id": string,"raw_files_included"?: boolean,"raw_files_notes"?: string | null,"revision"?: number,"status"?: string,"territory"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "additional_terms"?: string | null,"ai_training_allowed"?: boolean,"attribution_details"?: string | null,"attribution_required"?: boolean,"brand_approved_at"?: string | null,"content_type"?: string | null,"created_at"?: string,"created_by"?: string | null,"creator_approved_at"?: string | null,"deliverable_id"?: string | null,"derivative_edits_allowed"?: boolean,"derivative_notes"?: string | null,"dispute_reason"?: string | null,"duration_months"?: number | null,"exclusivity"?: string,"exclusivity_details"?: string | null,"id"?: string,"last_edited_by"?: string | null,"license_end"?: string | null,"license_start"?: string | null,"organic_use"?: boolean,"paid_ads_notes"?: string | null,"paid_ads_use"?: boolean,"project_id"?: string,"raw_files_included"?: boolean,"raw_files_notes"?: string | null,"revision"?: number,"status"?: string,"territory"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rights_records_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rights_records_deliverable_id_fkey"
      columns: ["deliverable_id"]
isOneToOne: false
      referencedRelation: "deliverables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rights_records_last_edited_by_fkey"
      columns: ["last_edited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rights_records_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_campaigns": {
                  Row: {
                    "campaign_id": string,"created_at": string,"creator_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign_id": string,"created_at"?: string,"creator_id": string
                  }
                  Update: {
                    "campaign_id"?: string,"created_at"?: string,"creator_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_campaigns_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_campaigns_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_creators": {
                  Row: {
                    "brand_id": string,"campaign_id": string | null,"created_at": string,"creator_id": string,"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand_id": string,"campaign_id"?: string | null,"created_at"?: string,"creator_id": string,"note"?: string | null
                  }
                  Update: {
                    "brand_id"?: string,"campaign_id"?: string | null,"created_at"?: string,"creator_id"?: string,"note"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_creators_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brand_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_creators_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_creators_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "creator_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"skills": {
                  Row: {
                    "active": boolean,"category_id": number | null,"id": number,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"category_id"?: number | null,"id"?: never,"name": string,"slug": string
                  }
                  Update: {
                    "active"?: boolean,"category_id"?: number | null,"id"?: never,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "skills_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "creator_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"squad_role_skills": {
                  Row: {
                    "skill_id": number,"squad_role_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "skill_id": number,"squad_role_id": string
                  }
                  Update: {
                    "skill_id"?: number,"squad_role_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "squad_role_skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_role_skills_squad_role_id_fkey"
      columns: ["squad_role_id"]
isOneToOne: false
      referencedRelation: "squad_roles"
      referencedColumns: ["id"]
    }
                  ]
                },"squad_roles": {
                  Row: {
                    "budget_cents": number | null,"campaign_id": string,"category_id": number | null,"created_at": string,"deliverable_type_id": number | null,"description": string | null,"headcount": number,"id": string,"sort_order": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "budget_cents"?: number | null,"campaign_id": string,"category_id"?: number | null,"created_at"?: string,"deliverable_type_id"?: number | null,"description"?: string | null,"headcount"?: number,"id"?: string,"sort_order"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "budget_cents"?: number | null,"campaign_id"?: string,"category_id"?: number | null,"created_at"?: string,"deliverable_type_id"?: number | null,"description"?: string | null,"headcount"?: number,"id"?: string,"sort_order"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "squad_roles_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_roles_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "creator_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_roles_deliverable_type_id_fkey"
      columns: ["deliverable_type_id"]
isOneToOne: false
      referencedRelation: "deliverable_types"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "rights_records_effective": {
                  Row: {
                    "additional_terms": string | null,"ai_training_allowed": boolean | null,"attribution_details": string | null,"attribution_required": boolean | null,"brand_approved_at": string | null,"content_type": string | null,"created_at": string | null,"created_by": string | null,"creator_approved_at": string | null,"deliverable_id": string | null,"derivative_edits_allowed": boolean | null,"derivative_notes": string | null,"dispute_reason": string | null,"duration_months": number | null,"effective_status": string | null,"exclusivity": string | null,"exclusivity_details": string | null,"id": string | null,"last_edited_by": string | null,"license_end": string | null,"license_start": string | null,"organic_use": boolean | null,"paid_ads_notes": string | null,"paid_ads_use": boolean | null,"project_id": string | null,"raw_files_included": boolean | null,"raw_files_notes": string | null,"revision": number | null,"status": string | null,"territory": string | null,"title": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "additional_terms"?: string | null,"ai_training_allowed"?: boolean | null,"attribution_details"?: string | null,"attribution_required"?: boolean | null,"brand_approved_at"?: string | null,"content_type"?: string | null,"created_at"?: string | null,"created_by"?: string | null,"creator_approved_at"?: string | null,"deliverable_id"?: string | null,"derivative_edits_allowed"?: boolean | null,"derivative_notes"?: string | null,"dispute_reason"?: string | null,"duration_months"?: number | null,"effective_status"?: never,"exclusivity"?: string | null,"exclusivity_details"?: string | null,"id"?: string | null,"last_edited_by"?: string | null,"license_end"?: string | null,"license_start"?: string | null,"organic_use"?: boolean | null,"paid_ads_notes"?: string | null,"paid_ads_use"?: boolean | null,"project_id"?: string | null,"raw_files_included"?: boolean | null,"raw_files_notes"?: string | null,"revision"?: number | null,"status"?: string | null,"territory"?: string | null,"title"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "additional_terms"?: string | null,"ai_training_allowed"?: boolean | null,"attribution_details"?: string | null,"attribution_required"?: boolean | null,"brand_approved_at"?: string | null,"content_type"?: string | null,"created_at"?: string | null,"created_by"?: string | null,"creator_approved_at"?: string | null,"deliverable_id"?: string | null,"derivative_edits_allowed"?: boolean | null,"derivative_notes"?: string | null,"dispute_reason"?: string | null,"duration_months"?: number | null,"effective_status"?: never,"exclusivity"?: string | null,"exclusivity_details"?: string | null,"id"?: string | null,"last_edited_by"?: string | null,"license_end"?: string | null,"license_start"?: string | null,"organic_use"?: boolean | null,"paid_ads_notes"?: string | null,"paid_ads_use"?: boolean | null,"project_id"?: string | null,"raw_files_included"?: boolean | null,"raw_files_notes"?: string | null,"revision"?: number | null,"status"?: string | null,"territory"?: string | null,"title"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "rights_records_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rights_records_deliverable_id_fkey"
      columns: ["deliverable_id"]
isOneToOne: false
      referencedRelation: "deliverables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rights_records_last_edited_by_fkey"
      columns: ["last_edited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rights_records_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_proposal":
{ Args: { "p_note"?: string,"p_proposal_id": string }; Returns: string
                           },
"agree_project_scope":
{ Args: { "p_project_id": string }; Returns: undefined
                           },
"approve_rights_record":
{ Args: { "p_record_id": string,"p_revision": number }; Returns: undefined
                           },
"audit":
{ Args: { "p_action": string,"p_campaign_id": string,"p_entity_id": string,"p_entity_type": string,"p_metadata": Json,"p_project_id": string }; Returns: undefined
                           },
"brand_list_proposals":
{ Args: { "p_campaign_id"?: string }; Returns: {
              "approach": string,"blind_review": boolean,"campaign_id": string,"campaign_title": string,"categories": (string)[],"creator_avatar_path": string,"creator_headline": string,"creator_id": string,"creator_label": string,"creator_location": string,"creator_slug": string,"currency": string,"deliverables": Json,"id": string,"identity_revealed": boolean,"match_score": number,"project_id": string,"proposed_delivery_date": string,"quote_cents": number,"revisions_included": number,"samples": Json,"skills": (string)[],"squad_role_id": string,"status": string,"styles": (string)[],"submitted_at": string,"timeline_days": number,"usage_notes": string
            }[]
                           },
"campaign_match_candidates":
{ Args: { "p_campaign_id": string,"p_limit"?: number }; Returns: {
              "creator_id": string,"overlap": number
            }[]
                           },
"can_read_project_object":
{ Args: { "p_object_name": string }; Returns: boolean
                           },
"can_upload_deliverable":
{ Args: { "p_object_name": string }; Returns: boolean
                           },
"can_view_campaign":
{ Args: { "p_campaign_id": string }; Returns: boolean
                           },
"can_view_creator":
{ Args: { "p_creator_id": string }; Returns: boolean
                           },
"can_view_proposal":
{ Args: { "p_proposal_id": string }; Returns: boolean
                           },
"cancel_project":
{ Args: { "p_project_id": string,"p_reason": string }; Returns: undefined
                           },
"check_rate_limit":
{ Args: { "p_bucket": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"complete_onboarding":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"complete_project":
{ Args: { "p_project_id": string }; Returns: undefined
                           },
"creator_trust_stats":
{ Args: { "p_creator_id": string }; Returns: {
              "average_rating": number,"completed_projects": number,"review_count": number
            }[]
                           },
"current_role_name":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"deliverable_project":
{ Args: { "p_deliverable_id": string }; Returns: string
                           },
"dispute_project":
{ Args: { "p_project_id": string,"p_reason": string }; Returns: undefined
                           },
"dispute_rights_record":
{ Args: { "p_reason": string,"p_record_id": string }; Returns: undefined
                           },
"ensure_proposal_conversation":
{ Args: { "p_proposal_id": string }; Returns: string
                           },
"invite_creator":
{ Args: { "p_campaign_id": string,"p_creator_id": string,"p_message": string,"p_squad_role_id"?: string }; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_conversation_member":
{ Args: { "p_conversation_id": string }; Returns: boolean
                           },
"is_project_member":
{ Args: { "p_project_id": string }; Returns: boolean
                           },
"mark_proposal_under_review":
{ Args: { "p_proposal_id": string }; Returns: undefined
                           },
"notify":
{ Args: { "p_body": string,"p_entity_id": string,"p_entity_type": string,"p_link": string,"p_recipient": string,"p_title": string,"p_type": string }; Returns: undefined
                           },
"owns_campaign":
{ Args: { "p_campaign_id": string }; Returns: boolean
                           },
"owns_draft_proposal":
{ Args: { "p_proposal_id": string }; Returns: boolean
                           },
"project_member_role":
{ Args: { "p_project_id": string }; Returns: string
                           },
"record_ai_analysis":
{ Args: { "p_entity_id": string,"p_entity_type": string,"p_error_code": string,"p_input_tokens": number,"p_kind": string,"p_latency_ms": number,"p_model": string,"p_output": Json,"p_output_tokens": number,"p_status": string }; Returns: string
                           },
"refresh_my_deadline_notifications":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"refresh_project_progress":
{ Args: { "p_project_id": string }; Returns: undefined
                           },
"reject_proposal":
{ Args: { "p_note"?: string,"p_proposal_id": string }; Returns: undefined
                           },
"resolve_project_dispute":
{ Args: { "p_note": string,"p_project_id": string }; Returns: undefined
                           },
"respond_invitation":
{ Args: { "p_accept": boolean,"p_invitation_id": string }; Returns: undefined
                           },
"reveal_proposal_identity":
{ Args: { "p_proposal_id": string }; Returns: undefined
                           },
"review_deliverable":
{ Args: { "p_body": string,"p_decision": string,"p_deliverable_id": string }; Returns: undefined
                           },
"save_rights_record":
{ Args: { "p_platform_ids": (number)[],"p_project_id": string,"p_record_id": string,"p_submit": boolean,"p_terms": Json }; Returns: string
                           },
"search_campaigns":
{ Args: { "p_category_id"?: number,"p_deadline_before"?: string,"p_deliverable_type_id"?: number,"p_limit"?: number,"p_min_budget_cents"?: number,"p_offset"?: number,"p_platform_id"?: number,"p_query"?: string,"p_sort"?: string }; Returns: {
              "blind_review": boolean,"brand_id": string,"brand_logo_path": string,"brand_name": string,"brand_slug": string,"budget_max_cents": number,"budget_min_cents": number,"category": string,"currency": string,"deadline": string,"deliverables": (string)[],"id": string,"objective": string,"platforms": (string)[],"published_at": string,"rank": number,"styles": (string)[],"title": string,"total_count": number
            }[]
                           },
"search_creators":
{ Args: { "p_availability"?: string,"p_category_id"?: number,"p_country"?: string,"p_language"?: string,"p_limit"?: number,"p_max_rate_cents"?: number,"p_offset"?: number,"p_platform_id"?: number,"p_query"?: string,"p_skill_id"?: number,"p_sort"?: string,"p_style_ids"?: (number)[] }; Returns: {
              "availability": string,"avatar_path": string,"categories": (string)[],"currency": string,"display_name": string,"headline": string,"id": string,"location_city": string,"location_country": string,"preview_paths": (string)[],"rank": number,"skills": (string)[],"slug": string,"starting_rate_cents": number,"styles": (string)[],"total_count": number
            }[]
                           },
"set_initial_role":
{ Args: { "p_role": string }; Returns: undefined
                           },
"set_match_ai_explanation":
{ Args: { "p_match_id": string,"p_text": string }; Returns: undefined
                           },
"slugify":
{ Args: { "value": string }; Returns: string
                           },
"store_match_results":
{ Args: { "p_algorithm_version": string,"p_campaign_id": string,"p_results": Json,"p_squad_role_id": string }; Returns: number
                           },
"submit_deliverable_version":
{ Args: { "p_deliverable_id": string,"p_external_url": string,"p_file_name": string,"p_mime_type": string,"p_notes": string,"p_size_bytes": number,"p_storage_path": string }; Returns: string
                           },
"submit_proposal":
{ Args: { "p_proposal_id": string }; Returns: undefined
                           },
"submit_review":
{ Args: { "p_body": string,"p_project_id": string,"p_rating": number }; Returns: string
                           },
"transition_campaign":
{ Args: { "p_campaign_id": string,"p_status": string }; Returns: undefined
                           },
"withdraw_invitation":
{ Args: { "p_invitation_id": string }; Returns: undefined
                           },
"withdraw_proposal":
{ Args: { "p_proposal_id": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
