# Build a self-contained, deployable copy of the site into build/.
# Static p5.js app, no bundler: we copy only the files the app actually loads,
# flatten them under build/ (index.html at the root), and rewrite the asset
# paths to use the minified libraries.
#
#   make          # build build/
#   make serve    # build + serve over http (fonts/audio need http, not file://)
#   make zip      # build + package build/ into a deployable zip
#   make clean    # remove build/ and the zip

BUILD := build
SITE  := london-isp-midterm-ex2

# Vendored libraries. Min builds where available; p5.speech ships no min build,
# so its readable source is used as-is.
LIBS := \
	libraries/p5/p5.min.js \
	libraries/p5/addons/p5.sound.min.js \
	libraries/p5/addons/p5.speech.js

# The 7 font files the app loads in app/css/styles.css, plus the OFL licenses
# (required when redistributing OFL fonts).
FONTS := \
	fonts/hanken-grotesk/HankenGrotesk-Regular.ttf \
	fonts/hanken-grotesk/HankenGrotesk-SemiBold.ttf \
	fonts/hanken-grotesk/HankenGrotesk-Bold.ttf \
	fonts/hanken-grotesk/HankenGrotesk-ExtraBold.ttf \
	fonts/hanken-grotesk/OFL.txt \
	fonts/spline-sans-mono/SplineSansMono-Regular.ttf \
	fonts/spline-sans-mono/SplineSansMono-Medium.ttf \
	fonts/spline-sans-mono/SplineSansMono-SemiBold.ttf \
	fonts/spline-sans-mono/OFL.txt

.PHONY: build serve zip clean

build: clean
	@echo ">> building $(BUILD)/"
	@# vendored libraries + fonts, copied with their paths preserved
	@set -e; for f in $(LIBS) $(FONTS); do \
		mkdir -p "$(BUILD)/$$(dirname "$$f")"; \
		cp "$$f" "$(BUILD)/$$f"; \
	done
	@# app scripts, flattened from app/js/ to build/js/
	@mkdir -p "$(BUILD)/js"
	@cp app/js/*.js "$(BUILD)/js/"
	@# app styles: css moves up one level, so ../../fonts -> ../fonts
	@mkdir -p "$(BUILD)/css"
	@sed 's#\.\./\.\./fonts/#../fonts/#g' app/css/styles.css > "$(BUILD)/css/styles.css"
	@# index.html at the build root: drop the leading ../ from library paths and
	@# swap the two libraries that have minified builds.
	@sed \
		-e 's#\.\./libraries/#libraries/#g' \
		-e 's#libraries/p5/p5\.js#libraries/p5/p5.min.js#' \
		-e 's#libraries/p5/addons/p5\.sound\.js#libraries/p5/addons/p5.sound.min.js#' \
		app/index.html > "$(BUILD)/index.html"
	@echo ">> done. $(BUILD)/ size: $$(du -sh $(BUILD) | awk '{print $$1}')"

serve: build
	@echo ">> serving $(BUILD)/ at http://localhost:8000"
	@cd $(BUILD) && python3 -m http.server 8000

zip: build
	@rm -f $(SITE).zip
	@cd $(BUILD) && zip -qr ../$(SITE).zip .
	@echo ">> wrote $(SITE).zip ($$(du -h $(SITE).zip | awk '{print $$1}'))"

clean:
	@rm -rf $(BUILD) $(SITE).zip
