npm run build
aws s3 sync out s3://poskojasa-static-dev/
aws cloudfront create-invalidation --distribution-id E17O6F1PSVAJO2 --paths "/*"
