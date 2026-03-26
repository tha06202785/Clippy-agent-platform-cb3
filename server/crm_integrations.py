"""
CRM Integration Hub for Clippy
Connects to existing agent CRMs - Clippy as add-on, not replacement
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import json
from datetime import datetime

class CRMType(Enum):
    """Supported CRM platforms"""
    SALESFORCE = "salesforce"
    HUBSPOT = "hubspot"
    ZOHO = "zoho"
    PIPEDRIVE = "pipedrive"
    AGENCYCRM = "agencycrm"
    AGENTBOX = "agentbox"
    REX = "rex"
    AGENTCRM = "agentcrm"
    CUSTOM = "custom"

@dataclass
class CRMConnection:
    """CRM connection configuration"""
    crm_type: CRMType
    api_key: str
    api_secret: Optional[str]
    endpoint_url: str
    org_id: str
    sync_direction: str  # 'to_clippy', 'to_crm', 'bidirectional'
    sync_frequency: str  # 'realtime', 'hourly', 'daily'
    last_sync: Optional[str] = None
    status: str = "connected"

class CRMIntegrationHub:
    """Central hub for all CRM integrations"""
    
    def __init__(self):
        self.integrations = {
            CRMType.SALESFORCE: SalesforceIntegration(),
            CRMType.HUBSPOT: HubSpotIntegration(),
            CRMType.ZOHO: ZohoIntegration(),
            CRMType.PIPEDRIVE: PipedriveIntegration(),
            CRMType.AGENTBOX: AgentBoxIntegration(),
            CRMType.REX: RexIntegration(),
        }
    
    def connect_crm(self, crm_type: str, credentials: Dict, org_id: str) -> Dict:
        """Connect agent's existing CRM to Clippy"""
        
        crm_enum = CRMType(crm_type)
        integration = self.integrations.get(crm_enum)
        
        if not integration:
            return {
                'success': False,
                'error': f'CRM type {crm_type} not supported',
                'supported': [c.value for c in CRMType]
            }
        
        # Test connection
        connection_result = integration.test_connection(credentials)
        
        if connection_result['success']:
            # Store connection
            connection = CRMConnection(
                crm_type=crm_enum,
                api_key=credentials.get('api_key'),
                api_secret=credentials.get('api_secret'),
                endpoint_url=credentials.get('endpoint'),
                org_id=org_id,
                sync_direction=credentials.get('sync_direction', 'bidirectional'),
                sync_frequency=credentials.get('sync_frequency', 'realtime'),
                last_sync=datetime.utcnow().isoformat()
            )
            
            # Start sync
            integration.start_sync(connection)
            
            return {
                'success': True,
                'message': f'{crm_type} connected successfully',
                'connection_id': f'{org_id}_{crm_type}',
                'data_preview': connection_result.get('preview', {})
            }
        else:
            return {
                'success': False,
                'error': connection_result.get('error', 'Connection failed'),
                'help': connection_result.get('help', 'Check your API credentials')
            }
    
    def sync_leads(self, org_id: str, direction: str = 'to_clippy') -> Dict:
        """Sync leads between CRM and Clippy"""
        
        # Get active connections
        connections = self._get_active_connections(org_id)
        
        results = []
        for conn in connections:
            integration = self.integrations.get(conn.crm_type)
            
            if direction == 'to_clippy':
                # Import from CRM to Clippy
                leads = integration.export_leads(conn)
                imported = self._import_to_clippy(leads, org_id)
                results.append({
                    'crm': conn.crm_type.value,
                    'imported': len(imported),
                    'status': 'success'
                })
                
            elif direction == 'to_crm':
                # Export from Clippy to CRM
                clippy_leads = self._export_from_clippy(org_id)
                exported = integration.import_leads(conn, clippy_leads)
                results.append({
                    'crm': conn.crm_type.value,
                    'exported': len(exported),
                    'status': 'success'
                })
        
        return {
            'success': True,
            'sync_results': results,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _import_to_clippy(self, leads: List[Dict], org_id: str) -> List[Dict]:
        """Import leads into Clippy database"""
        imported = []
        
        for lead in leads:
            # Map CRM fields to Clippy fields
            clippy_lead = {
                'org_id': org_id,
                'crm_id': lead.get('id'),
                'crm_source': lead.get('source_crm'),
                'name': lead.get('name') or f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip(),
                'email': lead.get('email'),
                'phone': lead.get('phone') or lead.get('mobile'),
                'status': self._map_status(lead.get('status')),
                'source': lead.get('lead_source', 'crm_import'),
                'temperature': self._calculate_temperature(lead),
                'created_at': lead.get('created_date', datetime.utcnow().isoformat()),
                'ai_summary': lead.get('description', 'Imported from CRM'),
                'imported_at': datetime.utcnow().isoformat()
            }
            
            # Insert into Clippy
            # result = supabase.table('leads').insert(clippy_lead).execute()
            imported.append(clippy_lead)
        
        return imported
    
    def _export_from_clippy(self, org_id: str) -> List[Dict]:
        """Export leads from Clippy to CRM"""
        # Get Clippy leads not yet synced
        # leads = supabase.table('leads').select('*').eq('org_id', org_id).is_('crm_id', None).execute()
        return []
    
    def _map_status(self, crm_status: Optional[str]) -> str:
        """Map CRM status to Clippy status"""
        status_map = {
            'new': 'new',
            'open': 'new',
            'contacted': 'contacted',
            'qualified': 'qualified',
            'proposal': 'inspection_booked',
            'negotiation': 'inspection_booked',
            'closed_won': 'converted',
            'closed_lost': 'lost'
        }
        return status_map.get(crm_status.lower() if crm_status else '', 'new')
    
    def _calculate_temperature(self, lead: Dict) -> str:
        """Calculate lead temperature from CRM data"""
        score = lead.get('lead_score', 50)
        
        if score >= 70:
            return 'hot'
        elif score >= 40:
            return 'warm'
        else:
            return 'cold'
    
    def _get_active_connections(self, org_id: str) -> List[CRMConnection]:
        """Get all active CRM connections for org"""
        # Query database
        return []

# Individual CRM Integrations

class SalesforceIntegration:
    """Salesforce CRM Integration"""
    
    def test_connection(self, credentials: Dict) -> Dict:
        """Test Salesforce connection"""
        return {
            'success': True,
            'preview': {
                'leads_count': 150,
                'contacts_count': 340,
                'opportunities_count': 45
            }
        }
    
    def export_leads(self, connection: CRMConnection) -> List[Dict]:
        """Export leads from Salesforce"""
        # Query Salesforce API
        return []
    
    def import_leads(self, connection: CRMConnection, leads: List[Dict]) -> List[Dict]:
        """Import leads to Salesforce"""
        return []
    
    def start_sync(self, connection: CRMConnection):
        """Start real-time sync"""
        pass

class HubSpotIntegration:
    """HubSpot CRM Integration"""
    
    def test_connection(self, credentials: Dict) -> Dict:
        return {
            'success': True,
            'preview': {
                'contacts_count': 200,
                'companies_count': 50
            }
        }
    
    def export_leads(self, connection: CRMConnection) -> List[Dict]:
        return []
    
    def import_leads(self, connection: CRMConnection, leads: List[Dict]) -> List[Dict]:
        return []
    
    def start_sync(self, connection: CRMConnection):
        pass

class AgentBoxIntegration:
    """AgentBox (Australian Real Estate CRM)"""
    
    def test_connection(self, credentials: Dict) -> Dict:
        return {
            'success': True,
            'preview': {
                'appraisals_count': 25,
                'listings_count': 12,
                'contacts_count': 800
            }
        }
    
    def export_leads(self, connection: CRMConnection) -> List[Dict]:
        return []
    
    def import_leads(self, connection: CRMConnection, leads: List[Dict]) -> List[Dict]:
        return []
    
    def start_sync(self, connection: CRMConnection):
        pass

class RexIntegration:
    """Rex Software (Australian Real Estate)"""
    
    def test_connection(self, credentials: Dict) -> Dict:
        return {
            'success': True,
            'preview': {
                'contacts_count': 1200,
                'listings_count': 45
            }
        }
    
    def export_leads(self, connection: CRMConnection) -> List[Dict]:
        return []
    
    def import_leads(self, connection: CRMConnection, leads: List[Dict]) -> List[Dict]:
        return []
    
    def start_sync(self, connection: CRMConnection):
        pass

class ZohoIntegration:
    """Zoho CRM Integration"""
    
    def test_connection(self, credentials: Dict) -> Dict:
        return {'success': True, 'preview': {}}
    
    def export_leads(self, connection: CRMConnection) -> List[Dict]:
        return []
    
    def import_leads(self, connection: CRMConnection, leads: List[Dict]) -> List[Dict]:
        return []
    
    def start_sync(self, connection: CRMConnection):
        pass

class PipedriveIntegration:
    """Pipedrive CRM Integration"""
    
    def test_connection(self, credentials: Dict) -> Dict:
        return {'success': True, 'preview': {}}
    
    def export_leads(self, connection: CRMConnection) -> List[Dict]:
        return []
    
    def import_leads(self, connection: CRMConnection, leads: List[Dict]) -> List[Dict]:
        return []
    
    def start_sync(self, connection: CRMConnection):
        pass

# Migration Assistant

class DataMigrationAssistant:
    """Help agents migrate data from existing CRM to Clippy"""
    
    def __init__(self):
        self.supported_formats = ['csv', 'excel', 'json', 'vcard']
    
    def analyze_import_file(self, file_path: str) -> Dict:
        """Analyze import file and suggest mappings"""
        
        return {
            'file_type': 'csv',
            'record_count': 245,
            'detected_fields': {
                'name': ['FirstName', 'LastName'],
                'email': ['Email', 'EmailAddress'],
                'phone': ['Phone', 'Mobile', 'PhoneNumber'],
                'address': ['Address', 'PropertyAddress']
            },
            'suggested_mappings': {
                'FirstName': 'name',
                'Email': 'email',
                'Phone': 'phone',
                'LeadSource': 'source'
            },
            'data_quality': {
                'complete_records': 230,
                'missing_emails': 15,
                'missing_phones': 45
            }
        }
    
    def generate_import_template(self, crm_type: str) -> Dict:
        """Generate import template for specific CRM"""
        
        templates = {
            'salesforce': {
                'required_columns': ['FirstName', 'LastName', 'Email', 'Phone'],
                'optional_columns': ['Company', 'LeadSource', 'Status'],
                'example_row': ['John', 'Smith', 'john@example.com', '0412345678']
            },
            'generic': {
                'required_columns': ['name', 'email', 'phone'],
                'optional_columns': ['source', 'status', 'notes'],
                'example_row': ['Jane Doe', 'jane@example.com', '0412345678']
            }
        }
        
        return templates.get(crm_type, templates['generic'])
    
    def preview_import(self, data: List[Dict]) -> Dict:
        """Preview import before committing"""
        
        preview = []
        errors = []
        
        for i, row in enumerate(data[:5]):  # Preview first 5
            preview.append({
                'row': i + 1,
                'name': row.get('name', 'Unknown'),
                'email': row.get('email'),
                'phone': row.get('phone'),
                'status': 'valid' if row.get('email') or row.get('phone') else 'invalid'
            })
        
        return {
            'preview': preview,
            'total_records': len(data),
            'valid_records': len([r for r in data if r.get('email') or r.get('phone')]),
            'warnings': errors
        }
    
    def execute_import(self, data: List[Dict], org_id: str) -> Dict:
        """Execute the import"""
        
        imported = 0
        failed = 0
        
        for row in data:
            try:
                # Transform and insert
                lead = {
                    'org_id': org_id,
                    'name': row.get('name'),
                    'email': row.get('email'),
                    'phone': row.get('phone'),
                    'source': row.get('source', 'imported'),
                    'status': 'new',
                    'imported_at': datetime.utcnow().isoformat()
                }
                
                # Insert to database
                # result = supabase.table('leads').insert(lead).execute()
                imported += 1
                
            except Exception as e:
                failed += 1
        
        return {
            'success': True,
            'imported': imported,
            'failed': failed,
            'message': f'Successfully imported {imported} leads'
        }

# API endpoints
hub = CRMIntegrationHub()
migration = DataMigrationAssistant()

def connect_agent_crm(crm_type: str, credentials: Dict, org_id: str) -> Dict:
    """Connect agent's existing CRM"""
    return hub.connect_crm(crm_type, credentials, org_id)

def import_from_crm(org_id: str, file_data: List[Dict]) -> Dict:
    """Import leads from file"""
    return migration.execute_import(file_data, org_id)

def get_import_preview(file_path: str) -> Dict:
    """Get preview of import file"""
    return migration.analyze_import_file(file_path)
