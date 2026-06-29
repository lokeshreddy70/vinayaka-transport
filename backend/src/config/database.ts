import { PrismaClient } from '@prisma/client';
import logger from './logger';

const DB_ENV_KEYS = [
	'SUPABASE_DATABASE_URL',
	'SUPABASE_DB_URL',
	'SUPABASE_POOLER_URL',
	'DATABASE_URL',
] as const;

const sanitizeConnectionTarget = (url: string): string => {
	try {
		const parsed = new URL(url);
		return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
	} catch {
		return 'invalid-url';
	}
};

const resolveDatabaseUrl = (): { key: string; url: string } => {
	for (const key of DB_ENV_KEYS) {
		const value = process.env[key]?.trim();
		if (value) {
			return { key, url: value };
		}
	}

	throw new Error(
		'Missing database connection URL. Provide one of SUPABASE_DATABASE_URL, SUPABASE_DB_URL, SUPABASE_POOLER_URL, DATABASE_URL.'
	);
};

const { key: databaseKey, url: databaseUrl } = resolveDatabaseUrl();

if (/localhost|127\.0\.0\.1/i.test(databaseUrl) && process.env.NODE_ENV === 'production') {
	logger.warn(
		{
			source: databaseKey,
			target: sanitizeConnectionTarget(databaseUrl),
		},
		'Production database URL points to localhost. Supabase URL should be configured in Vercel environment variables.'
	);
}

export const databaseRuntime = {
	sourceEnv: databaseKey,
	target: sanitizeConnectionTarget(databaseUrl),
	provider: /supabase\.co|supabase/i.test(databaseUrl) ? 'supabase-postgres' : 'postgresql',
};

logger.info(databaseRuntime, 'Database runtime resolved');

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: databaseUrl,
		},
	},
});

export default prisma;
