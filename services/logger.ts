import { supabase } from '../lib/supabase';

export type AuditAction = 
  | 'login'
  | 'view_card'
  | 'print_card'
  | 'export_card'
  | 'batch_print';

const getDeviceInfo = () => {
  try {
    const ua = window.navigator.userAgent;
    let deviceType = "Desktop";
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        deviceType = "Mobile";
    } else if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        deviceType = "Tablet";
    }
    
    let os = "Unknown OS";
    if (ua.indexOf("Win") !== -1) os = "Windows";
    if (ua.indexOf("Mac") !== -1) os = "Mac/iOS";
    if (ua.indexOf("Linux") !== -1) os = "Linux";
    if (ua.indexOf("Android") !== -1) os = "Android";
    
    let browser = "Unknown Browser";
    if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
    else if (ua.indexOf("Safari") !== -1) browser = "Safari";
    else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
    else if (ua.indexOf("MSIE") !== -1 || ua.indexOf("Trident/") !== -1) browser = "IE/Edge";

    return `${os} • ${browser} • ${deviceType}`;
  } catch(e) {
    return "Unknown Device";
  }
};

export const logAction = async (userId: string | undefined, action: AuditAction, details: Record<string, any> = {}) => {
  if (!userId) return; // Cannot log without a user

  try {
    const enrichedDetails = {
      ...details,
      deviceInfo: getDeviceInfo(),
    };

    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      details: enrichedDetails,
    });

    if (error) {
      console.error('Failed to write audit log:', error);
    }
  } catch (err) {
    console.error('Audit logging error:', err);
  }
};
