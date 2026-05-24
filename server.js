const express = require("express");
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const app = express();
const PORT = process.env.PORT || 3000;
const BOOKS_DIR = path.join(__dirname, "books");

marked.setOptions({
	gfm: true,
	breaks: false,
});

function slugFromFile(fileName) {
	return fileName.replace(/\.md$/i, "");
}

function loadBooks() {
	const files = fs
		.readdirSync(BOOKS_DIR)
		.filter((file) => file.toLowerCase().endsWith(".md"));

	return files.map((fileName) => {
		const fullPath = path.join(BOOKS_DIR, fileName);
		const raw = fs.readFileSync(fullPath, "utf8");
		const parsed = matter(raw);
		const slug = slugFromFile(fileName);

		return {
			slug,
			name: parsed.data.name || slug,
			author: parsed.data.author || "Nepoznati autor",
			shortDescription: parsed.data.shortDescription || "",
			year: parsed.data.year || null,
			cover: parsed.data.cover || null,
			markdown: parsed.content.trim(),
			html: marked.parse(parsed.content),
			meta: parsed.data,
		};
	});
}

function getBookBySlug(slug) {
	const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, "");
	const filePath = path.join(BOOKS_DIR, `${safeSlug}.md`);

	if (!fs.existsSync(filePath)) {
		return null;
	}

	const raw = fs.readFileSync(filePath, "utf8");
	const parsed = matter(raw);

	return {
		slug: safeSlug,
		name: parsed.data.name || safeSlug,
		author: parsed.data.author || "Nepoznati autor",
		shortDescription: parsed.data.shortDescription || "",
		year: parsed.data.year || null,
		cover: parsed.data.cover || null,
		markdown: parsed.content.trim(),
		html: marked.parse(parsed.content),
		meta: parsed.data,
	};
}

app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/fonts", express.static(path.join(__dirname, "fonts")));

app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

app.get("/api/books", (_req, res) => {
	const books = loadBooks();
	res.json({ total: books.length, books });
});

app.get("/api/books/:slug", (req, res) => {
	const book = getBookBySlug(req.params.slug);

	if (!book) {
		return res.status(404).json({ message: "Book not found" });
	}

	return res.json(book);
});

app.get("/books", (_req, res) => {
	const books = loadBooks();
	const items = books
		.map(
			(book) => `
      <article style="border:1px solid #ddd;padding:16px;margin-bottom:12px;border-radius:10px;">
        <h2 style="margin:0 0 8px 0;">${book.name}</h2>
        <p style="margin:0 0 8px 0;"><strong>Autor:</strong> ${book.author}</p>
        <p style="margin:0 0 8px 0;">${book.shortDescription}</p>
        <a href="/books/${book.slug}">Procitaj vise</a>
      </article>
    `,
		)
		.join("");

	res.send(`
    <!doctype html>
    <html lang="sr">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Knjige</title>
      </head>
      <body style="font-family: Georgia, serif; max-width: 760px; margin: 32px auto; padding: 0 16px;">
        <h1>Katalog knjiga</h1>
        <p>Podaci i opis su ucitani iz Markdown fajlova.</p>
        ${items}
      </body>
    </html>
  `);
});

app.get("/books/:slug", (req, res) => {
	const book = getBookBySlug(req.params.slug);

	if (!book) {
		return res.status(404).send("<h1>Knjiga nije pronadjena</h1>");
	}

	return res.send(`
    <!doctype html>
    <html lang="sr">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${book.name}</title>
      </head>
      <body style="font-family: Georgia, serif; max-width: 760px; margin: 32px auto; padding: 0 16px;">
        <a href="/books">← Nazad na katalog</a>
        <h1>${book.name}</h1>
        <p><strong>Autor:</strong> ${book.author}</p>
        <p><strong>Kratak opis:</strong> ${book.shortDescription}</p>
        <hr />
        ${book.html}
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
	console.log(`Books app running at http://localhost:${PORT}`);
});
