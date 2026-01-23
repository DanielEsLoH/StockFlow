import { redirect } from 'react-router';

// Redirect to dashboard
export function loader() {
  throw redirect('/system-admin/dashboard');
}

export default function SystemAdminIndex() {
  return null;
}