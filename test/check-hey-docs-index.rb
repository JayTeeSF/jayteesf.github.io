#!/usr/bin/env ruby
require 'cgi'
require 'pathname'

root = Pathname(__dir__).parent
articles = root.join('articles')
index_name = '2026-10-25-hey-index.html'
pages = articles.glob('*hey*.html').reject { |p| p.basename.to_s.start_with?('DRAFT-') }.sort
index = articles.join(index_name).read
failures = []
assert = ->(ok, message) { failures << message unless ok }
text = ->(html) { CGI.unescapeHTML(html.gsub(/<[^>]*>/m, '')).strip }
attribute = ->(attrs, name) { match = attrs.match(/\b#{Regexp.escape(name)}="([^"]*)"/); match && CGI.unescapeHTML(match[1]) }

assert.call(pages.length == 35, 'expected the complete 35-page Hey inventory')
catalogue = index.scan(/data-doc-page="([^"]+)"/).flatten
assert.call(catalogue.sort == (pages.map { |p| p.basename.to_s } - [index_name]).sort, 'catalogue must list every other page exactly once')
%w[picture thesis start reference legend today decisions organised notes-h].each do |id|
  assert.call(index.include?(%Q{id="#{id}"}), 'old index anchor missing: ' + id)
end
section_count = 0
pages.each do |path|
  html = path.read
  assert.call(html.include?('class="hey-docs-nav"'), path.basename.to_s + ': prominent docs-index navigation missing')
  next if path.basename.to_s == index_name
  html.scan(/<h2\b([^>]*)>(.*?)<\/h2>/mi).each do |attrs, heading|
    id = attribute.call(attrs, 'id'); purpose = attribute.call(attrs, 'data-doc-purpose')
    label = path.basename.to_s + ': ' + text.call(heading)
    assert.call(id && !id.empty?, label + ': missing section ID')
    assert.call(purpose && purpose.length >= 15, label + ': missing short section purpose')
    assert.call(id && index.include?(%Q{href="#{path.basename}##{CGI.escapeHTML(id)}"}), label + ': section missing from catalogue')
    section_count += 1
  end
end
assert.call(index.include?('hey-guide-functions.html'), 'current Functions tutorial missing')
assert.call(index.include?('hey-functions.html'), 'current Functions reference missing')
assert.call(index.include?('0–12 bytes') && index.include?('32 bytes'), 'String/HeyValue size caveats missing')
if failures.any?
  warn failures.first(12).join("\n")
  abort "Hey docs index FAIL: #{failures.length} checks"
end
puts "Hey docs index PASS: #{pages.length} pages, #{catalogue.length} catalogue entries, #{section_count} section links"
