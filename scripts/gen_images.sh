#!/bin/bash
# Generate AI product images for the shop panel
mkdir -p /home/z/my-project/public/products
cd /home/z/my-project/public/products

gen() {
  local file="$1"
  local prompt="$2"
  if [ -s "$file" ]; then
    echo "SKIP $file (exists)"
    return 0
  fi
  echo "GEN $file ..."
  z-ai image -p "$prompt" -o "./$file" -s 1024x1024 && echo "OK $file" || echo "FAIL $file"
}

gen "phone-titanium.png" "Professional studio product photography of a premium modern flagship smartphone with dark titanium gray finish, back view with triple camera module, floating on clean pure white background, soft studio lighting, e-commerce style, high quality, detailed"
gen "phone-violet.png" "Professional studio product photography of a modern flagship smartphone with deep violet purple finish, back view with three vertical camera lenses, clean pure white background, soft studio lighting, e-commerce style, high quality"
gen "phone-green.png" "Professional studio product photography of a modern flagship smartphone with dark matte green finish, back view with large square camera module, clean pure white background, studio lighting, e-commerce style, high quality"
gen "phone-black.png" "Professional studio product photography of a modern smartphone with midnight black finish, dual diagonal camera system on back, clean pure white background, studio lighting, e-commerce style, high quality"
gen "phone-blue.png" "Professional studio product photography of a modern mid-range smartphone with ice blue finish, back view with three separate camera rings, clean pure white background, studio lighting, e-commerce style, high quality"
gen "phone-silver.png" "Professional studio product photography of a modern budget smartphone with silver gray finish, large circular camera module on back, clean pure white background, studio lighting, e-commerce style, high quality"
gen "case-clear.png" "Professional studio product photography of a transparent clear silicone phone case standing upright, minimal design, clean pure white background, soft reflections, e-commerce style, high quality"
gen "case-leather.png" "Professional studio product photography of a premium dark brown leather phone case with card slot on the back, elegant stitching, clean pure white background, studio lighting, e-commerce style, high quality"
gen "case-rugged.png" "Professional studio product photography of a rugged black protective phone case with reinforced corners and heavy duty armor design, clean pure white background, studio lighting, e-commerce style, high quality"
gen "case-bluepattern.png" "Professional studio product photography of a slim phone case with elegant blue geometric wave pattern design, clean pure white background, studio lighting, e-commerce style, high quality"
gen "earbuds.png" "Professional studio product photography of white wireless earbuds with open charging case, minimalist modern design, clean pure white background, soft studio lighting, e-commerce style, high quality"
gen "charger.png" "Professional studio product photography of a compact white fast wall charger with a USB-C cable coiled neatly beside it, clean pure white background, studio lighting, e-commerce style, high quality"

echo "ALL DONE"
