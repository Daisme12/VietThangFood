import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Đang nạp dữ liệu mẫu (Seed Data) vào cơ sở dữ liệu MySQL...');
  const sqlPath = join(__dirname, '..', 'docker', 'init.sql');
  const rawSql = readFileSync(sqlPath, 'utf8');

  // Tách từng câu lệnh SQL (bỏ qua dòng comment)
  const statements = rawSql
    .split(/;\s*\r?\n/)
    .map((s) =>
      s
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((s) => s.length > 0 && !s.toUpperCase().startsWith('USE ') && !s.toUpperCase().startsWith('CREATE DATABASE'));

  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }

  console.log('✅ Đã nạp thành công toàn bộ 13 bảng dữ liệu mẫu cho Xưởng Trà Sữa Việt Thắng!');
}

main()
  .catch((err) => {
    console.error('❌ Lỗi khi nạp dữ liệu mẫu:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

