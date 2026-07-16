#!/usr/bin/env ruby
# frozen_string_literal: true

require "cgi"
require "pathname"
require "time"

class PackagesIndex
  LINKABLE_EXTENSIONS = %w[.md .html].freeze

  def initialize(packages_dir)
    @packages_dir = Pathname(packages_dir).expand_path
    @output_path = @packages_dir.join("index.html")
  end

  def generate
    validate_packages_dir!

    @output_path.write(render_page)
    puts "Generated #{@output_path}"
  end

  private

  attr_reader :packages_dir, :output_path

  def validate_packages_dir!
    return if packages_dir.directory?

    abort "Packages directory does not exist: #{packages_dir}"
  end

  def package_directories
    packages_dir
      .children
      .select(&:directory?)
      .reject { |path| path.basename.to_s.start_with?(".") }
      .sort_by { |path| path.basename.to_s.downcase }
  end

  def docs_directories(package_dir)
    Dir.glob(package_dir.join("**", "docs").to_s)
      .map { |path| Pathname(path) }
      .select(&:directory?)
      .sort_by { |path| natural_sort_key(relative_path(path)) }
  end

  def linkable_files(package_dir)
    Dir.glob(package_dir.join("**", "*").to_s)
      .map { |path| Pathname(path) }
      .select(&:file?)
      .select { |path| LINKABLE_EXTENSIONS.include?(path.extname.downcase) }
      .sort_by { |path| natural_sort_key(relative_path(path)) }
  end

  def relative_path(path)
    path.relative_path_from(packages_dir).to_s
  end

  def display_path(path)
    path.relative_path_from(path.parents.find { |parent| parent.parent == packages_dir } || packages_dir).to_s
  rescue ArgumentError
    relative_path(path)
  end

  def href_for(path, directory: false)
    relative = relative_path(path)
    encoded = relative.split("/").map { |segment| CGI.escape(segment).tr("+", "%20") }.join("/")
    directory ? "#{encoded}/" : encoded
  end

  def natural_sort_key(value)
    value.split(/(\d+(?:\.\d+)*)/).map do |part|
      if part.match?(/\A\d+(?:\.\d+)*\z/)
        part.split(".").map(&:to_i)
      else
        part.downcase
      end
    end
  end

  def package_section(package_dir)
    docs = docs_directories(package_dir)
    files = linkable_files(package_dir)

    <<~HTML
      <section class="package">
        <h2>#{html(package_dir.basename.to_s)}</h2>
        #{docs_section(package_dir, docs)}
        #{files_section(package_dir, files)}
      </section>
    HTML
  end

  def docs_section(package_dir, docs)
    return '<p class="empty">No docs directories found.</p>' if docs.empty?

    links = docs.map do |docs_dir|
      label = docs_dir.relative_path_from(package_dir).to_s + "/"

      <<~HTML
        <li class="directory">
          <a href="#{href_for(docs_dir, directory: true)}">#{html(label)}</a>
        </li>
      HTML
    end.join

    <<~HTML
      <h3>Documentation directories</h3>
      <ul>
        #{links}
      </ul>
    HTML
  end

  def files_section(package_dir, files)
    return '<p class="empty">No Markdown or HTML files found.</p>' if files.empty?

    links = files.map do |file|
      label = file.relative_path_from(package_dir).to_s

      <<~HTML
        <li>
          <a href="#{href_for(file)}">#{html(label)}</a>
        </li>
      HTML
    end.join

    <<~HTML
      <h3>Markdown and HTML files</h3>
      <ul>
        #{links}
      </ul>
    HTML
  end

  def render_page
    packages = package_directories

    sections =
      if packages.empty?
        '<p class="empty">No packages found.</p>'
      else
        packages.map { |package_dir| package_section(package_dir) }.join
      end

    <<~HTML
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Hey Packages</title>
        <style>
          :root {
            color-scheme: light dark;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            line-height: 1.5;
          }

          body {
            max-width: 960px;
            margin: 0 auto;
            padding: 2rem 1rem 4rem;
          }

          header {
            margin-bottom: 2rem;
          }

          .package {
            margin: 1.5rem 0;
            padding: 1rem 1.25rem;
            border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
            border-radius: 0.5rem;
          }

          h2 {
            margin-top: 0;
          }

          h3 {
            margin-bottom: 0.25rem;
            font-size: 1rem;
          }

          ul {
            margin-top: 0.25rem;
          }

          li {
            margin: 0.2rem 0;
          }

          .directory a {
            font-weight: 600;
          }

          .empty,
          .generated-at {
            opacity: 0.7;
          }

          code {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Hey Packages</h1>
          <p>Documentation and browsable package files.</p>
        </header>

        <main>
          #{sections}
        </main>

        <footer>
          <p class="generated-at">
            Generated #{html(Time.now.utc.iso8601)}
          </p>
        </footer>
      </body>
      </html>
    HTML
  end

  def html(value)
    CGI.escapeHTML(value)
  end
end

packages_dir = ARGV.fetch(0, File.join(__dir__, "packages"))
PackagesIndex.new(packages_dir).generate
