#!/usr/bin/env ruby
# frozen_string_literal: true
require 'cgi'
require 'pathname'

class HeyDocsIndex
  GROUPS = {
    'start' => ['Start writing and building', 'Pick the guide for your task. These are independent starting points, not prerequisites.'],
    'reference' => ['Language and library reference', 'Look up syntax, functions, modules and library operations.'],
    'compiler' => ['Compiler, String storage and performance', 'Understand the architecture, memory representation and evidence behind performance claims.'],
    'concurrency' => ['Actors, parallel work and distribution', 'Choose an ownership and execution model, then check its failure and delivery rules.'],
    'build' => ['Build, native integration and tools', 'Find deployment paths, C interfaces, commands and platform constraints.'],
    'decisions' => ['Decision ledger', 'Find the reasoning and recorded status behind a language or compiler decision.'],
    'history' => ['Earlier essays · version-scoped', 'Read these as design and implementation history. Their measurements and status belong to their original versions.']
  }.freeze
  INDEX = '2026-10-25-hey-index.html'
  START = '<!-- HEY_DOCS_CATALOGUE_START -->'
  FINISH = '<!-- HEY_DOCS_CATALOGUE_END -->'

  def initialize(directory)
    @directory = Pathname(directory)
  end

  def attr(text, key)
    match = text.match(/\b#{Regexp.escape(key)}="([^"]*)"/)
    match && CGI.unescapeHTML(match[1])
  end

  def meta(html, name)
    tag = html.scan(/<meta\b[^>]*>/mi).find { |m| attr(m, 'name') == name }
    tag && attr(tag, 'content')
  end

  def plain(html)
    CGI.unescapeHTML(html.gsub(/<[^>]*>/m, '')).gsub(/\s+/, ' ').strip
      .sub(/^\d+\s*[.·]\s*/, '').sub(/\s+(?:Works today.*|Partly works|Decided, coming)$/, '')
  end

  def pages
    @directory.glob('*hey*.html').reject { |p| p.basename.to_s == INDEX || p.basename.to_s.start_with?('DRAFT-') }.map do |path|
      html = path.read
      group = meta(html, 'hey-docs-group')
      raise "#{path}: missing/unknown docs group" unless GROUPS.key?(group)
      title = meta(html, 'hey-docs-title'); purpose = meta(html, 'hey-docs-purpose')
      raise "#{path}: missing page title/purpose" if [title, purpose].any? { |s| s.nil? || s.empty? }
      sections = html.scan(/<h2\b([^>]*)>(.*?)<\/h2>/mi).map do |attrs, heading|
        id = attr(attrs, 'id'); explanation = attr(attrs, 'data-doc-purpose')
        raise "#{path}: section lacks ID/purpose: #{plain(heading)}" if [id, explanation].any? { |s| s.nil? || s.empty? }
        { id: id, title: plain(heading), purpose: explanation }
      end
      raise "#{path}: duplicate section IDs" unless sections.map { |s| s[:id] }.uniq.length == sections.length
      { file: path.basename.to_s, group: group, title: title, purpose: purpose,
        rank: meta(html, 'hey-docs-rank').to_s, sections: sections }
    end.sort_by { |p| [p[:rank], p[:file]] }
  end

  def escape(text)
    CGI.escapeHTML(text.to_s)
  end

  def render
    all = pages
    GROUPS.map do |group, (title, purpose)|
      entries = all.select { |page| page[:group] == group }
      next if entries.empty?
      legacy_caption = { 'start' => 'didx-1-cap', 'reference' => 'didx-2-cap' }[group]
      lead_id = legacy_caption ? %Q{ id="#{legacy_caption}"} : ''
      cards = entries.map do |page|
        sections = page[:sections].map do |section|
          %Q{<li><a href="#{escape(page[:file])}##{escape(section[:id])}">#{escape(section[:title])}</a><p>#{escape(section[:purpose])}</p></li>}
        end.join("\n")
        badge = group == 'history' ? '<span class="page-kind">Earlier essay</span>' :
          page[:file].start_with?('hey-') ? '<span class="page-kind">Current companion</span>' : ''
        <<~HTML
          <article class="doc-card" data-doc-page="#{escape(page[:file])}">
          #{badge}<h3><a href="#{escape(page[:file])}">#{escape(page[:title])}</a></h3>
          <p class="page-purpose">#{escape(page[:purpose])}</p>
          <details><summary aria-label="Sections in #{escape(page[:title])} (#{page[:sections].length})">Sections <span class="section-count">(#{page[:sections].length})</span></summary>
          <ul class="sections">#{sections}</ul></details>
          </article>
        HTML
      end.join("\n")
      <<~HTML
        <section class="topic" data-topic="#{group}" aria-labelledby="#{group}">
        <h2 id="#{group}">#{escape(title)} <span class="topic-count">#{entries.length} #{entries.length == 1 ? 'page' : 'pages'}</span></h2>
        <p#{lead_id} class="topic-purpose">#{escape(purpose)}</p>
        <div class="doc-grid">#{cards}</div>
        </section>
      HTML
    end.compact.join("\n")
  end

  def output
    path = @directory.join(INDEX); html = path.read
    raise 'catalogue markers missing/ambiguous' unless html.scan(START).length == 1 && html.scan(FINISH).length == 1
    html.sub(/#{Regexp.escape(START)}.*?#{Regexp.escape(FINISH)}/m, START + "\n" + render + FINISH)
  end
end

if ARGV.include?('--help') || ARGV.include?('-h')
  puts 'Usage: ruby generate-hey-docs-index.rb [--check] [ARTICLES_DIR]'
  puts 'Reads page metadata and H2 purposes from the source pages; no HTML gems required.'
  exit
end
check = ARGV.delete('--check')
abort 'Expected at most one articles directory' if ARGV.length > 1 || ARGV.any? { |a| a.start_with?('-') }
directory = ARGV.fetch(0, File.join(__dir__, 'articles'))
generator = HeyDocsIndex.new(directory); generated = generator.output
path = File.join(directory, HeyDocsIndex::INDEX)
if check
  abort 'Hey docs catalogue is stale; run ruby generate-hey-docs-index.rb' unless File.read(path) == generated
  puts 'Hey docs catalogue is current'
else
  File.write(path, generated)
  puts "Generated #{path} from #{generator.pages.length} pages"
end
