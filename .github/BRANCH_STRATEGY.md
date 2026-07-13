## Branch Strategy

main          → Production (protected, requires PR + CI pass)
develop       → Staging (protected, requires PR)
feature/*     → Feature branches (PR → develop)
fix/*         → Bug fix branches (PR → develop)
hotfix/*      → Critical fixes (PR → main + develop)

## Rules (set in GitHub Settings → Branches)
- main: require PR, require CI to pass, require 1 approval
- develop: require PR, require CI to pass
