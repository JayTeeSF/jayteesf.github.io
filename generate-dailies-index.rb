#!/usr/bin/env ruby
# frozen_string_literal: true

# Generates dailies/index.html from the files inside the dailies directory.
# Sibling of generate-articles-index.rb, with dailies-appropriate rules:
# no meta tags are REQUIRED — the date comes from the filename's
# YYYY-MM-DD- prefix (falling back to an article-date meta tag if one
# exists), the title from <title> (falling back to the filename stem),
# and the description from article-desc when present. The existing
# index.html is DELETED before regeneration (no backup: the directory
# lives in a git repo).

require "fileutils"

module DailiesIndex
  module_function

  def new(dailies_dir)
    {
      dailies_dir: dailies_dir,
      output_path: File.join(dailies_dir, "index.html")
    }
  end

  def generate(index)
    validate_dailies_dir!(index)
    delete_existing_index!(index)
    File.write(index[:output_path], render_page(index))
    puts "Generated #{index[:output_path]}"
  end

  def validate_dailies_dir!(index)
    return if File.directory?(index[:dailies_dir])

    raise "Dailies directory does not exist: #{index[:dailies_dir]}"
  end

  # Explicit requirement: remove the old index before writing the new one.
  # No backup — the directory is inside a git repo.
  def delete_existing_index!(index)
    return unless File.exist?(index[:output_path])

    FileUtils.rm_rf(index[:output_path])
    puts "Deleted #{index[:output_path]}"
  end

  def find_between(haystack, open_marker, close_marker)
    start_index = haystack.index(open_marker)
    return "" unless start_index

    value_start = start_index + open_marker.length
    end_index = haystack.index(close_marker, value_start)
    return "" unless end_index

    haystack[value_start...end_index]
  end

  def meta_value(content, name)
    marker = %(<meta name="#{name}" content=")
    find_between(content, marker, '"')
  end

  def extract_title(content)
    find_between(content, "<title>", "</title>")
  end

  # A question page is named ASK-NNN-YYYY-MM-DD-slug.html. The NUMBER is a
  # fact already carried by the filename, so it is DERIVED here rather than
  # restated in a meta tag or -- as it was until 2026-08-02 -- typed by hand
  # into index.html, where the first honest regeneration destroyed it.
  #
  # Only the NUMBER is derived. The prose half of the title stays authored,
  # because a slug is a URL and a title is a sentence: deriving
  # "confirm-what-you-chose" gives you no capitals, no punctuation and no
  # em-dash. Derive the fact, author the prose.
  def ask_number_from_filename(filename)
    match = filename.match(/\AASK-(\d+)/)
    return "" unless match

    match[1].to_i.to_s
  end

  def stem(filename)
    filename.end_with?(".html") ? filename.delete_suffix(".html") : filename
  end

  # A daily is named YYYY-MM-DD-some-slug.html; the first ten characters
  # are the date. Validate the shape loosely (digits and dashes in the
  # right places) rather than parsing a calendar.
  def date_from_filename(filename)
    return "" if filename.length < 10

    candidate = filename[0, 10]
    return candidate if candidate[4] == "-" && candidate[7] == "-"

    ""
  end

  # An index entry may legitimately differ from the page's own <title>: a
  # <title> is a browser tab and wants to be short, an index entry is a shelf
  # label and wants to be descriptive. Before these overrides existed that
  # difference was maintained BY HAND inside index.html, so running this
  # generator silently REWROTE other seats' entries — by 2026-08-01 five
  # descriptions and three titles had drifted, and regenerating was a silent
  # edit to someone else's published copy.
  #
  # article-index-title / article-index-desc win when present, so the page
  # carries its own index copy and the generator becomes idempotent. Neither is
  # required: omit them and <title> / article-desc are used exactly as before.
  def parse_daily(path)
    content = File.read(path)
    filename = File.basename(path)

    title = meta_value(content, "article-index-title")
    title = extract_title(content) if title.empty?
    title = stem(filename) if title.empty?

    # The number comes from the filename, never from the prose. A page that
    # already spells its own number keeps it; one that does not gets it
    # prefixed. Either way the index and the filename cannot disagree.
    ask = ask_number_from_filename(filename)
    title = "Ask ##{ask} &mdash; #{title}" if !ask.empty? && !title.start_with?("Ask #")

    date = date_from_filename(filename)
    date = meta_value(content, "article-date") if date.empty?

    desc = meta_value(content, "article-index-desc")
    desc = meta_value(content, "article-desc") if desc.empty?

    {
      filename: filename,
      title: title,
      date: date,
      desc: desc
    }
  end

  def daily_files(dailies_dir)
    Dir.glob(File.join(dailies_dir, "*.html"))
       .select { |path| File.file?(path) }
       .reject do |path|
         name = File.basename(path)
         name == "index.html" || name.start_with?("DRAFT-")
       end
  end

  def parse_all(dailies_dir)
    daily_files(dailies_dir).map { |path| parse_daily(path) }
  end

  # Newest date first; filename ascending breaks ties (deterministic for
  # several dailies on one day). Undated files sort last, by filename.
  def compare_entries(left, right)
    date_cmp = right[:date] <=> left[:date]
    return date_cmp unless date_cmp.zero?

    left[:filename] <=> right[:filename]
  end

  def daily_item_lines(daily)
    lines = [
      "    <li>",
      %(      <a href="#{daily[:filename]}">#{daily[:title]}</a>)
    ]

    unless daily[:desc].empty?
      lines << %(      <p class="desc">#{daily[:desc]}</p>)
    end

    unless daily[:date].empty?
      lines << %(      <span class="date">#{daily[:date]}</span>)
    end

    lines << "    </li>"
    lines
  end

  def listing_lines(entries)
    return ['  <p class="empty">No dailies found.</p>'] if entries.empty?

    lines = ['  <ul class="articles">']
    entries.each { |daily| lines.concat(daily_item_lines(daily)) }
    lines << "  </ul>"
    lines
  end

  def render_page(index)
    dailies = parse_all(index[:dailies_dir])
    sorted = dailies.sort { |left, right| compare_entries(left, right) }
    listing = listing_lines(sorted)

    lines = [
      "<!DOCTYPE html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      "<title>Dailies — JayTeeSF</title>",
      "<style>",
      "  :root {",
      "    --bg: #fcfcfb; --ink: #0b0b0b; --muted: #52514e;",
      "    --border: #e1e0d9; --accent: #2a78d6;",
      "  }",
      "  @media (prefers-color-scheme: dark) {",
      "    :root { --bg: #1a1a19; --ink: #ffffff; --muted: #c3c2b7;",
      "            --border: #2c2c2a; --accent: #3987e5; }",
      "  }",
      '  :root[data-theme="dark"] { --bg: #1a1a19; --ink: #ffffff; --muted: #c3c2b7;',
      "            --border: #2c2c2a; --accent: #3987e5; }",
      '  :root[data-theme="light"] { --bg: #fcfcfb; --ink: #0b0b0b; --muted: #52514e;',
      "            --border: #e1e0d9; --accent: #2a78d6; }",
      "  * { box-sizing: border-box; }",
      "  body {",
      "    margin: 0; background: var(--bg); color: var(--ink);",
      '    font: 17px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,',
      "          Helvetica, Arial, sans-serif;",
      "  }",
      "  main { max-width: 46rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }",
      "  h1 { font-size: 1.9rem; line-height: 1.2; margin: 0 0 0.4rem; }",
      "  .sub { color: var(--muted); margin: 0 0 2.5rem; }",
      "  ul.articles { list-style: none; margin: 0; padding: 0; }",
      "  ul.articles li { margin: 0 0 1.4rem; }",
      "  ul.articles a {",
      "    color: var(--accent); text-decoration: none; font-weight: 600;",
      "    font-size: 1.12rem;",
      "  }",
      "  ul.articles a:hover { text-decoration: underline; }",
      "  .desc { color: var(--muted); margin: 0.15rem 0 0; }",
      "  .date { font-size: 0.85rem; color: var(--muted); }",
      "  .home { display: inline-block; margin-bottom: 2rem; color: var(--muted);",
      "          text-decoration: none; font-size: 0.9rem; }",
      "  .home:hover { color: var(--accent); }",
      "</style>",
      "</head>",
      "<body>",
      "<main>",
      '  <a class="home" href="../index.html">&larr; www.jayteesf.com</a>',
      "  <h1>Dailies</h1>",
      '  <p class="sub">Day-by-day working documents from the Hey language',
      "  program — status pages, ladders, and running records.</p>",
      *listing,
      "</main>",
      "</body>",
      "</html>",
      ""
    ]

    lines.join("\n")
  end
end

def usage
  puts "usage: generate-dailies-index [DAILIES_DIR]"
  puts
  puts "Deletes DAILIES_DIR/index.html and regenerates it from the .html"
  puts "files in that directory. Dates come from YYYY-MM-DD- filename"
  puts "prefixes (or an article-date meta tag); titles from <title>;"
  puts "descriptions from article-desc when present. No meta tags are"
  puts "required. Default DAILIES_DIR: ./dailies"
  puts
  puts "  -h, --help   show this help and exit"
  0
end

begin
  dailies_dir = "./dailies"

  case ARGV.length
  when 0
    # Use default.
  when 1
    first = ARGV.first

    if %w[-h --help].include?(first)
      exit usage
    elsif first.start_with?("-")
      usage
      raise "unknown option: #{first}"
    else
      dailies_dir = first
    end
  else
    usage
    raise "expected zero or one DAILIES_DIR argument"
  end

  DailiesIndex.generate(DailiesIndex.new(dailies_dir))
rescue StandardError => e
  warn "generate-dailies-index: #{e.message}"
  exit 1
end
