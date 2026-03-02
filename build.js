/**
 * CreditGen 10X — Netlify Build Script
 * Scans posts/ directory, parses YAML frontmatter from each .md file,
 * and generates posts/index.json automatically on every deploy.
 *
 * Run: node build.js
 * Netlify runs this before publishing via netlify.toml [build] command
 */

const fs   = require('fs');
const path = require('path');

const POSTS_DIR   = path.join(__dirname, 'posts');
const OUTPUT_FILE = path.join(POSTS_DIR, 'index.json');

// ── Minimal YAML frontmatter parser (no dependencies needed) ────────────────
function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};

    const yaml = match[1];
    const meta = {};

    // Parse line by line — handles strings, numbers, booleans, simple lists
    const lines = yaml.split('\n');
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) { i++; continue; }

        const key   = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();

        if (value === '') {
            // Check for YAML list (indented lines starting with -)
            const list = [];
            i++;
            while (i < lines.length && /^\s+-/.test(lines[i])) {
                list.push(lines[i].replace(/^\s+-\s*/, '').replace(/^["']|["']$/g, '').trim());
                i++;
            }
            if (list.length) meta[key] = list;
            continue;
        }

        // Clean quotes
        const cleaned = value.replace(/^["']|["']$/g, '');

        // Type coercion
        if (cleaned === 'true')       meta[key] = true;
        else if (cleaned === 'false') meta[key] = false;
        else if (!isNaN(cleaned) && cleaned !== '') meta[key] = Number(cleaned);
        else meta[key] = cleaned;

        i++;
    }

    return meta;
}

// ── Extract slug from filename ───────────────────────────────────────────────
// Filenames: YYYY-MM-DD-my-slug.md  →  slug: my-slug
// Or just: my-slug.md  →  slug: my-slug
function extractSlug(filename) {
    const base = filename.replace(/\.md$/, '');
    // If it starts with a date pattern, strip it
    const withoutDate = base.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    return withoutDate;
}

// ── Main ─────────────────────────────────────────────────────────────────────
function buildIndex() {
    console.log('🔨 CreditGen 10X — Building posts/index.json...\n');

    if (!fs.existsSync(POSTS_DIR)) {
        fs.mkdirSync(POSTS_DIR, { recursive: true });
        console.log('  Created posts/ directory');
    }

    const files = fs.readdirSync(POSTS_DIR)
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse(); // newest first by filename date

    if (!files.length) {
        console.log('  No .md files found in posts/ — writing empty index.');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2));
        return;
    }

    const posts = [];

    for (const filename of files) {
        const filepath = path.join(POSTS_DIR, filename);
        const content  = fs.readFileSync(filepath, 'utf-8');
        const meta     = parseFrontmatter(content);
        const slug     = extractSlug(filename);

        // Skip if explicitly marked as draft
        if (meta.draft === true) {
            console.log(`  ⏭  Skipped (draft): ${filename}`);
            continue;
        }

        // Skip files with no title (likely non-post markdown like README)
        if (!meta.title) {
            console.log(`  ⏭  Skipped (no title): ${filename}`);
            continue;
        }

        const post = {
            slug,
            file:        `/posts/${filename}`,
            title:       meta.title       || '',
            description: meta.description || '',
            date:        meta.date         ? String(meta.date) : '',
            category:    meta.category    || '',
            tags:        meta.tags         || [],
            author:      meta.author      || 'CreditGen 10X Editorial Team',
            read_time:   meta.read_time   || null,
            thumbnail:   meta.thumbnail   || null,
            thumbnail_alt: meta.thumbnail_alt || null,
            noindex:     meta.noindex     || false,
        };

        posts.push(post);
        console.log(`  ✅ Indexed: ${slug}  (${meta.date || 'no date'})`);
    }

    // Sort by date descending (newest first)
    posts.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2));

    console.log(`\n✨ Done — ${posts.length} post(s) indexed → posts/index.json`);
}

buildIndex();
