#!/usr/bin/env ruby
# frozen_string_literal: true

require "cgi"
require "pathname"
require "time"

class PackagesIndex
  LINKABLE_EXTENSIONS = %w[.md .html].freeze

  def initialize(packages_dir, generated_at:)
    @packages_dir = Pathname(packages_dir).expand_path
    @output_path = @packages_dir.join("index.html")
    @generated_at = generated_at
  end

  def generate
    validate_packages_dir!
    output_path.write(render_page)
    puts "Generated #{output_path}"
  end

  private

  attr_reader :packages_dir, :output_path, :generated_at

  def validate_packages_dir!
    return if packages_dir.directory?

    abort "Packages directory does not exist: #{packages_dir}"
  end

  def digit?(character)
    character >= "0" && character <= "9"
  end

  def digit_run(value, start)
    finish = start
    finish += 1 while finish < value.length && digit?(value[finish])
    [value[start...finish], finish]
  end

  def trim_leading_zeroes(value)
    index = 0
    index += 1 while index + 1 < value.length && value[index] == "0"
    value[index..]
  end

  def compare_digit_runs(left, right)
    normalized_left = trim_leading_zeroes(left)
    normalized_right = trim_leading_zeroes(right)

    comparison = normalized_left.length <=> normalized_right.length
    return comparison unless comparison.zero?

    comparison = normalized_left <=> normalized_right
    return comparison unless comparison.zero?

    left.length <=> right.length
  end

  def compare_paths(left, right)
    folded_left = left.downcase
    folded_right = right.downcase
    left_index = 0
    right_index = 0

    while left_index < folded_left.length && right_index < folded_right.length
      left_character = folded_left[left_index]
      right_character = folded_right[right_index]

      if digit?(left_character) && digit?(right_character)
        left_run, left_index = digit_run(folded_left, left_index)
        right_run, right_index = digit_run(folded_right, right_index)
        comparison = compare_digit_runs(left_run, right_run)
        return comparison unless comparison.zero?
      else
        comparison = left_character <=> right_character
        return comparison unless comparison.zero?

        left_index += 1
        right_index += 1
      end
    end

    comparison = folded_left.length <=> folded_right.length
    return comparison unless comparison.zero?

    left <=> right
  end

  def sorted_unique(paths)
    paths.uniq.sort { |left, right| compare_paths(left.to_s, right.to_s) }
  end

  def package_directories
    packages_dir
      .children
      .select(&:directory?)
      .reject { |path| path.basename.to_s.start_with?(".") }
      .sort { |left, right| compare_paths(left.to_s, right.to_s) }
  end

  def package_files(package_dir)
    Dir.glob(package_dir.join("**", "*").to_s)
      .map { |path| Pathname(path) }
      .select(&:file?)
  end

  def docs_directories(package_dir, files)
    directories = []
    package_docs = package_dir.join("docs")
    directories << package_docs if package_docs.directory?

    package_dir.children.select(&:directory?).each do |version_dir|
      version_docs = version_dir.join("docs")
      directories << version_docs if version_docs.directory?
    end

    files.each do |path|
      current = path.dirname

      while current != package_dir
        if current.basename.to_s == "docs"
          directories << current
          current = package_dir
        else
          parent = current.dirname
          current = parent == current ? package_dir : parent
        end
      end
    end

    sorted_unique(directories)
  end

  def linkable_files(files)
    sorted_unique(
      files.select { |path| LINKABLE_EXTENSIONS.include?(path.extname.downcase) }
    )
  end

  def relative_path(path, root = packages_dir)
    path.relative_path_from(root).to_s
  end

  def html(value)
    CGI.escapeHTML(value)
  end

  def url_path(value)
    value
      .gsub("%", "%25")
      .gsub(" ", "%20")
      .gsub("#", "%23")
      .gsub("?", "%3F")
      .gsub('"', "%22")
      .gsub("'", "%27")
      .gsub("<", "%3C")
      .gsub(">", "%3E")
  end

  def directory_link(path, package_dir)
    href = "#{url_path(relative_path(path))}/"
    label = "#{relative_path(path, package_dir)}/"
    %(        <li class="directory"><a href="#{html(href)}">#{html(label)}</a></li>)
  end

  def file_link(path, package_dir)
    href = url_path(relative_path(path))
    label = relative_path(path, package_dir)
    %(        <li><a href="#{html(href)}">#{html(label)}</a></li>)
  end

  def documentation_section(docs, package_dir)
    return ['      <p class="empty">No docs directories found.</p>'] if docs.empty?

    [
      "      <h3>Documentation directories</h3>",
      "      <ul>",
      *docs.map { |path| directory_link(path, package_dir) },
      "      </ul>"
    ]
  end

  def files_section(files, package_dir)
    return ['      <p class="empty">No Markdown or HTML files found.</p>'] if files.empty?

    [
      "      <h3>Markdown and HTML files</h3>",
      "      <ul>",
      *files.map { |path| file_link(path, package_dir) },
      "      </ul>"
    ]
  end

  def package_section(package_dir)
    files = package_files(package_dir)
    docs = docs_directories(package_dir, files)
    linkable = linkable_files(files)
    package_name = package_dir.basename.to_s
    package_href = "#{url_path(relative_path(package_dir))}/"

    [
      '    <section class="package">',
      %(      <h2><a href="#{html(package_href)}">#{html(package_name)}</a></h2>),
      *documentation_section(docs, package_dir),
      *files_section(linkable, package_dir),
      "    </section>"
    ].join("\n")
  end

  def render_page
    sections =
      if package_directories.empty?
        ['    <p class="empty">No packages found.</p>']
      else
        package_directories.map { |package_dir| package_section(package_dir) }
      end

    lines = [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      "  <title>Hey Packages</title>",
      "  <style>",
      "    :root {",
      "      color-scheme: light dark;",
      '      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
      "      line-height: 1.5;",
      "    }",
      "",
      "    body {",
      "      max-width: 960px;",
      "      margin: 0 auto;",
      "      padding: 2rem 1rem 4rem;",
      "    }",
      "",
      "    header {",
      "      margin-bottom: 2rem;",
      "    }",
      "",
      "    .package {",
      "      margin: 1.5rem 0;",
      "      padding: 1rem 1.25rem;",
      "      border: 1px solid color-mix(in srgb, currentColor 20%, transparent);",
      "      border-radius: 0.5rem;",
      "    }",
      "",
      "    h2 {",
      "      margin-top: 0;",
      "    }",
      "",
      "    h3 {",
      "      margin-bottom: 0.25rem;",
      "      font-size: 1rem;",
      "    }",
      "",
      "    ul {",
      "      margin-top: 0.25rem;",
      "    }",
      "",
      "    li {",
      "      margin: 0.2rem 0;",
      "    }",
      "",
      "    .directory a {",
      "      font-weight: 600;",
      "    }",
      "",
      "    .empty,",
      "    .generated-at {",
      "      opacity: 0.7;",
      "    }",
      "",
      "    code {",
      "      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;",
      "    }",
      "  </style>",
      "</head>",
      "<body>",
      "  <header>",
      "    <h1>Hey Packages</h1>",
      "    <p>Documentation and browsable package files.</p>",
      "  </header>",
      "",
      "  <main>",
      *sections,
      "  </main>",
      "",
      "  <footer>",
      '    <p class="generated-at">',
      "      Generated #{html(generated_at)}",
      "    </p>",
      "  </footer>",
      "</body>",
      "</html>",
      ""
    ]

    lines.join("\n")
  end
end

packages_dir = ARGV.fetch(0, File.join(__dir__, "packages"))
generated_at = ENV.fetch("PACKAGES_INDEX_GENERATED_AT") { Time.now.utc.iso8601 }

PackagesIndex.new(
  packages_dir,
  generated_at: generated_at
).generate
