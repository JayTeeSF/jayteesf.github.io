#!/usr/bin/env ruby
# frozen_string_literal: true
#
# validate-html.rb — refuse to publish a page a browser cannot render.
#
# WHY THIS EXISTS
# ---------------
# On 2026-08-01 dailies/REVIEW-restructure-plan.html shipped with its second
# <style> block never closed. A browser parses everything after an unclosed
# <style> as CSS text, so the entire document body vanished: the live page
# rendered 88 characters instead of 15,050. It was blank for a day.
#
# Nothing in this repository could have caught it. The index generators search
# for a few <meta> strings and never parse the document, there is no linter, no
# git hook and no Makefile. The page was hand-written, committed, and pushed,
# and every step reported success.
#
# This script is the missing step. It fails loudly and non-zero.
#
# Run it over the whole site before pushing:
#     ruby validate-html.rb
# or over specific files:
#     ruby validate-html.rb dailies/FOO.html
#
# WHAT IT CHECKS
#   1. Tag balance for the containers whose loss destroys a page:
#      style, head, body, html, div, pre, main, footer.
#   2. Nesting order — a </div> that actually closes an open <pre> is a bug
#      even though the counts balance.
#   3. Renderable-text floor. The REVIEW page had BALANCED div and pre counts;
#      only the swallowed-body symptom distinguished it from a healthy page.
#      Counting tags alone would NOT have caught it. This check would.
#   4. The leaked-attribute signature: a closing tag or a stray quote-bracket
#      inside a <meta> content= value, which is how text from one page ends up
#      pasted into another page's head.

require 'set'

VOID = Set.new(%w[meta link br hr img input source area base col embed param track wbr])
TRACKED = Set.new(%w[style head body html div pre main footer script])
MIN_TEXT = 500 # a real page on this site is >10k; 500 is a floor, not a target

def check(path)
  src = File.read(path)
  problems = []

  # --- 1 & 2: balance and nesting, tracked containers only -----------------
  stack = []
  line = 1
  pos = 0
  src.scan(%r{<(/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(/?)>}m) do
    m = Regexp.last_match
    line += src[pos...m.begin(0)].count("\n")
    pos = m.begin(0)
    closing = m[1] == '/'
    name = m[2].downcase
    selfclose = m[3] == '/'
    next unless TRACKED.include?(name)
    next if VOID.include?(name) || selfclose

    if closing
      if stack.empty?
        problems << "line #{line}: stray </#{name}> with nothing open"
      elsif stack.last[0] != name
        problems << "line #{line}: </#{name}> closes <#{stack.last[0]}> opened at line #{stack.last[1]}"
        stack.pop
      else
        stack.pop
      end
    else
      stack.push([name, line])
    end
  end
  stack.each { |n, l| problems << "line #{l}: <#{n}> is never closed" }

  # --- 3: renderable text floor -------------------------------------------
  # Measure what a reader would actually see, the way a browser gets there.
  # The order matters: <style> and <script> are RAW TEXT elements, so an
  # unclosed one swallows the remainder of the document rather than being
  # ignored. Stripping only well-formed pairs is what made the first version
  # of this check silently pass the very page it was written for.
  visible = src.dup
  visible.gsub!(%r{<style\b.*?</style>}mi, '')
  visible.gsub!(%r{<script\b.*?</script>}mi, '')
  visible.sub!(%r{<style\b.*\z}mi, '')   # unclosed: eats the rest, as a browser does
  visible.sub!(%r{<script\b.*\z}mi, '')
  visible.gsub!(%r{<head\b.*?</head>}mi, '')
  visible.gsub!(/<[^>]*>/m, ' ')
  chars = visible.gsub(/&[a-z]+;/i, 'x').gsub(/\s+/, ' ').strip.length
  # Pages that build their body in JavaScript legitimately ship almost no
  # static text (the four game pages here do). Only a page with no script at
  # all is expected to carry its own prose, so only there is a low count
  # evidence of a swallowed body.
  scripted = src =~ /<script\b/i
  if chars < MIN_TEXT && !scripted
    problems << "only #{chars} characters of readable text " \
                "(floor #{MIN_TEXT}) — the body is being swallowed " \
                'by an unclosed style or head'
  end

  # --- 4: leaked attribute content ----------------------------------------
  # QUOTE PARITY IS THE WHOLE CHECK, and that is a finding rather than a
  # shortcut. A <meta> value may legitimately contain markup — the index
  # generators render article-index-title as HTML, so
  #   content="<strong>What you've decided</strong> — standing page"
  # is CORRECT. The broken REVIEW line was nearly identical in shape:
  #   content="Review of the restructure plan">What you've decided</strong> …">
  # No "is there a tag inside the value" or "is there text after the tag"
  # rule separates those two; both were tried here and both flagged the good
  # line. What actually separates them is that the bad paste leaves an ODD
  # number of quotes on the line. So this is the only rule that fires.
  src.each_line.with_index(1) do |l, n|
    next unless l =~ /<meta\b/i
    next unless l.scan(/"/).length.odd?

    problems << "line #{n}: odd number of quotes on a <meta> line — an attribute value is not terminated, which is the signature of text pasted in from another page"
  end

  problems
end

targets = ARGV.empty? ? Dir.glob('**/*.html').sort : ARGV
if targets.empty?
  warn 'validate-html.rb: no .html files found'
  exit 1
end

failed = 0
targets.each do |path|
  problems = check(path)
  next if problems.empty?

  failed += 1
  puts "FAIL #{path}"
  problems.each { |p| puts "     #{p}" }
end

if failed.zero?
  puts "ok — #{targets.length} page#{targets.length == 1 ? '' : 's'} well-formed and renderable"
  exit 0
end

puts
puts "#{failed} of #{targets.length} pages would not render correctly. Not publishable."
exit 1
