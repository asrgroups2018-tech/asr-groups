import AccessDeniedClient from './AccessDeniedClient';

export default async function AccessDeniedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = (key: string, fallback: string) => typeof params[key] === 'string' ? params[key] as string : fallback;
  return <AccessDeniedClient resource={value('resource', 'requested page')} action={value('action', 'view')} from={value('from', '/dashboard')} />;
}
