#!/usr/bin/env ruby
# frozen_string_literal: true

require "pathname"

class ArticlesIndex
  SERIES_HEADINGS = {
    "research" => "The research series",
    "campaign" => "The measurement campaign"
  }.freeze

  SERIES_ORDER = %w[research campaign].freeze

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

  def parse_article(path)
    content = path.read
    filename = path.basename.to_s

    title = extract_title(content)
    title = path.basename(".html").to_s if title.nil? || title.strip.empty?

    date = extract_meta(content, "article-date")
    series = extract_meta(content, "article-series")
    desc = extract_meta(content, "article-desc")

    missing = []
    missing << "article-date" if date.nil? || date.empty?
    missing << "article-series" if series.nil? || series.empty?
    missing << "article-desc" if desc.nil? || desc.empty?

    unless missing.empty?
      abort "#{filename}: missing required meta tag(s): #{missing.join(', ')}"
    end

    unless SERIES_ORDER.include?(series)
      abort "#{filename}: unknown article-series #{series.inspect} " \
            "(expected #{SERIES_ORDER.join(' or ')})"
    end

    { filename: filename, title: title, date: date, series: series, desc: desc }
  end

  def articles
    article_files.map { |path| parse_article(path) }
  end

  def compare_entries(left, right)
    comparison = right[:date] <=> left[:date]
    return comparison unless comparison.zero?

    left[:filename] <=> right[:filename]
  end

  def grouped_articles
    groups = Hash.new { |hash, key| hash[key] = [] }

    articles.each { |article| groups[article[:series]] << article }

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

  def series_section(series, entries)
    lines = ["  <h2>#{SERIES_HEADINGS.fetch(series)}</h2>"]

    if entries.empty?
      lines << '  <p class="empty">No articles found.</p>'
    else
      lines << '  <ul class="articles">'
      entries.each { |article| lines.concat(article_item(article)) }
      lines << "  </ul>"
    end

    lines
  end

  def render_page
    grouped = grouped_articles

    sections = SERIES_ORDER.flat_map do |series|
      ["", *series_section(series, grouped.fetch(series, []))]
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
      '  <p class="sub">Field notes from building and measuring the Hey programming',
      "  language — a benchmark campaign with receipts, and the research that",
      "  steers it.</p>",
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
  article-series and article-desc meta tags of the articles in
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
