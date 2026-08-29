#!/usr/bin/env ruby
# frozen_string_literal: true

require "pathname"

class ArticlesIndex
  # THE SHELF LABELS ARE THE SITE'S INFORMATION ARCHITECTURE, not a record of an
  # internal publishing habit. The previous set -- featured / benchmarks / almost /
  # daily -- described a benchmark campaign and a daily working log the site no
  # longer runs, and two of its four sections rendered as "No articles found."
  # A reader does not care which internal lane produced a page; they care which
  # question it answers. These buckets are those questions, in reading order.
  BUCKET_HEADINGS = {
    "start" => "Start here",
    "how-it-works" => "How Hey works",
    "build" => "Build with Hey",
    "actors" => "Actors",
    "research" => "Ideas and research",
    "status" => "Current project status",
    "reference" => "Reference"
  }.freeze

  BUCKET_ORDER = %w[start how-it-works build actors research status reference].freeze

  # Within a bucket the default order is newest first, which is wrong exactly
  # where two pages were published the same day and one is the prerequisite for
  # the other. article-index-rank is the escape hatch: lower sorts first, and it
  # is compared as TEXT so a page may simply omit it and take the default.
  DEFAULT_RANK = "50"

  def initialize(articles_dir)
    @articles_dir = Pathname(articles_dir).expand_path
    @output_path = @articles_dir.join("index.html")
  end

  def generate
    validate_articles_dir!
    output_path.write(render_page)
    puts "Generated #{output_path}"
  end

  private

  attr_reader :articles_dir, :output_path

  def validate_articles_dir!
    return if articles_dir.directory?

    abort "Articles directory does not exist: #{articles_dir}"
  end

  def article_files
    Pathname.glob(articles_dir.join("*.html"))
      .reject { |path| path.basename.to_s == "index.html" }
      .reject { |path| path.basename.to_s.start_with?("DRAFT-") }
      .sort_by { |path| path.basename.to_s }
  end

  def extract_meta(content, name)
    match = content.match(/<meta\s+name="#{Regexp.escape(name)}"\s+content="(.*?)"\s*>/m)
    match && match[1]
  end

  def extract_title(content)
    match = content.match(%r{<title>(.*?)</title>}m)
    match && match[1]
  end

  # An index entry may legitimately differ from the page's own <title>: a
  # <title> is a browser tab and wants to be short, an index entry is a shelf
  # label and wants to be descriptive. Without these overrides that difference
  # had to be maintained BY HAND inside index.html, so running this generator
  # silently REWROTE entries someone had written deliberately -- which is why
  # people stopped running it and started hand-editing, which is how the index
  # and the pages drifted apart in the first place.
  #
  # article-index-title / article-index-desc WIN when present, so each page
  # carries its own index copy and this generator is IDEMPOTENT. Neither is
  # required: omit them and <title> / article-desc are used exactly as before.
  #
  # This mirrors generate-articles-index.hey, its Hey twin. The two generators
  # disagreeing was itself the bug -- a fact restated in two programs, corrected
  # in one -- so any change here belongs in both. The dailies pair that once made
  # this a foursome was retired on 2026-08-29 along with the dailies category.
  def parse_article(path)
    content = path.read
    filename = path.basename.to_s

    title = extract_meta(content, "article-index-title")
    title = extract_title(content) if title.nil? || title.strip.empty?
    title = path.basename(".html").to_s if title.nil? || title.strip.empty?

    date = extract_meta(content, "article-date")
    bucket = extract_meta(content, "article-bucket")

    desc = extract_meta(content, "article-index-desc")
    desc = extract_meta(content, "article-desc") if desc.nil? || desc.empty?

    missing = []
    missing << "article-date" if date.nil? || date.empty?
    missing << "article-bucket" if bucket.nil? || bucket.empty?
    missing << "article-desc" if desc.nil? || desc.empty?

    unless missing.empty?
      abort "#{filename}: missing required meta tag(s): #{missing.join(', ')}"
    end

    unless BUCKET_ORDER.include?(bucket)
      abort "#{filename}: unknown article-bucket #{bucket.inspect} " \
            "(expected one of #{BUCKET_ORDER.join(', ')})"
    end

    rank = extract_meta(content, "article-index-rank")
    rank = DEFAULT_RANK if rank.nil? || rank.strip.empty?

    { filename: filename, title: title, date: date, bucket: bucket, desc: desc, rank: rank }
  end

  def articles
    article_files.map { |path| parse_article(path) }
  end

  def compare_entries(left, right)
    comparison = left[:rank] <=> right[:rank]
    return comparison unless comparison.zero?

    comparison = right[:date] <=> left[:date]
    return comparison unless comparison.zero?

    left[:filename] <=> right[:filename]
  end

  def grouped_articles
    groups = Hash.new { |hash, key| hash[key] = [] }

    articles.each { |article| groups[article[:bucket]] << article }

    groups.each_value { |entries| entries.sort! { |a, b| compare_entries(a, b) } }

    groups
  end

  def article_item(article)
    [
      "    <li>",
      %(      <a href="#{article[:filename]}">#{article[:title]}</a>),
      %(      <p class="desc">#{article[:desc]}</p>),
      %(      <span class="date">#{article[:date]}</span>),
      "    </li>"
    ]
  end

  # AN EMPTY BUCKET RENDERS NOTHING AT ALL. The old generator emitted the heading
  # plus "No articles found.", which is how the published index came to advertise
  # two sections -- Benchmark stories, Daily reports -- that had no contents and
  # no prospect of any. A shelf label with nothing on it is not information; it is
  # the residue of a workflow. Callers skip the section entirely.
  def bucket_section(bucket, entries)
    return [] if entries.empty?

    lines = ["  <h2>#{BUCKET_HEADINGS.fetch(bucket)}</h2>"]
    lines << '  <ul class="articles">'
    entries.each { |article| lines.concat(article_item(article)) }
    lines << "  </ul>"

    lines
  end

  def render_page
    grouped = grouped_articles

    sections = BUCKET_ORDER.flat_map do |bucket|
      section = bucket_section(bucket, grouped.fetch(bucket, []))
      section.empty? ? [] : ["", *section]
    end

    lines = [
      "<!DOCTYPE html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      "<title>Articles — JayTeeSF</title>",
      "<style>",
      "  :root {",
      "    --bg: #fcfcfb; --ink: #0b0b0b; --muted: #52514e;",
      "    --border: #e1e0d9; --accent: #2a78d6;",
      "  }",
      "  @media (prefers-color-scheme: dark) {",
      '    :root { --bg: #1a1a19; --ink: #ffffff; --muted: #c3c2b7;',
      '            --border: #2c2c2a; --accent: #3987e5; }',
      "  }",
      '  :root[data-theme="dark"] { --bg: #1a1a19; --ink: #ffffff; --muted: #c3c2b7;',
      '            --border: #2c2c2a; --accent: #3987e5; }',
      '  :root[data-theme="light"] { --bg: #fcfcfb; --ink: #0b0b0b; --muted: #52514e;',
      '            --border: #e1e0d9; --accent: #2a78d6; }',
      "  * { box-sizing: border-box; }",
      "  body {",
      "    margin: 0; background: var(--bg); color: var(--ink);",
      '    font: 17px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,',
      "          Helvetica, Arial, sans-serif;",
      "  }",
      '  main { max-width: 46rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }',
      '  h1 { font-size: 1.9rem; line-height: 1.2; margin: 0 0 0.4rem; }',
      "  .sub { color: var(--muted); margin: 0 0 2.5rem; }",
      "  h2 {",
      "    font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.06em;",
      "    color: var(--muted); border-bottom: 1px solid var(--border);",
      "    padding-bottom: 0.4rem; margin: 2.5rem 0 1rem;",
      "  }",
      '  ul.articles { list-style: none; margin: 0; padding: 0; }',
      "  ul.articles li { margin: 0 0 1.4rem; }",
      "  ul.articles a {",
      "    color: var(--accent); text-decoration: none; font-weight: 600;",
      "    font-size: 1.12rem;",
      "  }",
      "  ul.articles a:hover { text-decoration: underline; }",
      "  .desc { color: var(--muted); margin: 0.15rem 0 0; }",
      '  .date { font-size: 0.85rem; color: var(--muted); }',
      '  .home { display: inline-block; margin-bottom: 2rem; color: var(--muted);',
      "          text-decoration: none; font-size: 0.9rem; }",
      "  .home:hover { color: var(--accent); }",
      "</style>",
      "</head>",
      "<body>",
      "<main>",
      '  <a class="home" href="../index.html">&larr; www.jayteesf.com</a>',
      "  <h1>Articles</h1>",
      '  <p class="sub">Essays, guides, research and current reference material from',
      "  building the Hey programming language — how the language works, how its",
      "  compiler is being made trustworthy and fast, and what its actor and",
      "  distributed systems are trying to become.</p>",
      *sections,
      "</main>",
      "</body>",
      "</html>",
      ""
    ]

    lines.join("\n")
  end
end

USAGE = <<~TEXT
  usage: generate-articles-index [ARTICLES_DIR]

  Regenerates ARTICLES_DIR/index.html from the article-date,
  article-bucket and article-desc meta tags of the articles in
  that directory. Default ARTICLES_DIR: ./articles

    -h, --help   show this help and exit
TEXT

if ARGV.first == "--help" || ARGV.first == "-h"
  puts USAGE
  exit 0
elsif ARGV.first&.start_with?("-")
  puts USAGE
  abort "unknown option: #{ARGV.first}"
elsif ARGV.length > 1
  puts USAGE
  abort "expected zero or one ARTICLES_DIR argument"
end

articles_dir = ARGV.fetch(0, File.join(__dir__, "articles"))

ArticlesIndex.new(articles_dir).generate
