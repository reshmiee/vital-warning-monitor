$replacements = @{
    'font-size: 11px;' = 'font-size: 0.75rem;'
    'font-size: 12px;' = 'font-size: 0.75rem;'
    'font-size: 13px;' = 'font-size: 0.875rem;'
    'font-size: 0.68rem;' = 'font-size: 0.75rem;'
    'font-size: 0.72rem;' = 'font-size: 0.75rem;'
    'font-size: 0.75rem;' = 'font-size: 0.75rem;'
    'font-size: 0.8rem;' = 'font-size: 0.875rem;'
    'font-size: 0.82rem;' = 'font-size: 0.875rem;'
    'font-size: 0.84rem;' = 'font-size: 0.875rem;'
    'font-size: 0.85rem;' = 'font-size: 0.875rem;'
    'font-size: 0.88rem;' = 'font-size: 0.875rem;'
    'font-size: 0.9rem;' = 'font-size: 1rem;'
    'font-size: 0.92rem;' = 'font-size: 1rem;'
    'font-size: 0.95rem;' = 'font-size: 1rem;'
    'font-size: 0.96rem;' = 'font-size: 1rem;'
    'font-size: 0.98rem;' = 'font-size: 1rem;'
    'font-size: 1.02rem;' = 'font-size: 1rem;'
    'font-size: 1.05rem;' = 'font-size: 1rem;'
    'font-size: 1.12rem;' = 'font-size: 1.25rem;'
    'font-size: 1.15rem;' = 'font-size: 1.25rem;'
    'font-size: 1.2rem;' = 'font-size: 1.25rem;'
    'font-size: 1.3rem;' = 'font-size: 1.25rem;'
    'font-size: 1.35rem;' = 'font-size: 1.25rem;'
    'font-size: 1.45rem;' = 'font-size: 1.5rem;'
    'font-size: 1.6rem;' = 'font-size: 1.5rem;'
    'font-size: 1.85rem;' = 'font-size: 2rem;'
    'font-size: 2.05rem;' = 'font-size: 2rem;'
    'font-size: 2.15rem;' = 'font-size: 2rem;'
    'font-size: 2.2rem;' = 'font-size: 2rem;'
    'font-size: 2.35rem;' = 'font-size: 2.5rem;'
    'font-size: 2.5rem;' = 'font-size: 2.5rem;'
    'font-size: 2.55rem;' = 'font-size: 2.5rem;'
    'font-size: 2.75rem;' = 'font-size: 2.5rem;'
    'font-size: 3.5rem;' = 'font-size: 3rem;'
    'color: #0B1F41;' = 'color: var(--color-primary-text);'
    'color: #35557E;' = 'color: var(--color-text-muted);'
    'color: #3A4F6D;' = 'color: var(--color-text-muted);'
    'color: #475569;' = 'color: var(--color-text-muted);'
    'color: #64748B;' = 'color: var(--color-text-muted);'
    'color: #7E98A8;' = 'color: var(--color-text-subtle);'
    'color: #8494A7;' = 'color: var(--color-text-subtle);'
    'color: #94A3B8;' = 'color: var(--color-text-subtle);'
    'color: #CBD5E1;' = 'color: var(--color-text-subtle);'
    'color: #14495c;' = 'color: var(--color-primary-text);'
    'border-radius: 6px;' = 'border-radius: var(--radius-sm);'
    'border-radius: 8px;' = 'border-radius: var(--radius-sm);'
    'border-radius: 10px;' = 'border-radius: var(--radius-md);'
    'border-radius: 12px;' = 'border-radius: var(--radius-md);'
    'border-radius: 18px;' = 'border-radius: var(--radius-lg);'
    'border-radius: 20px;' = 'border-radius: var(--radius-lg);'
    'border-radius: 24px;' = 'border-radius: var(--radius-lg);'
    'var(--radius-xl)' = 'var(--radius-lg)'
    'border-radius: 2px;' = 'border-radius: var(--radius-full);'
    'border-radius: 0 4px 4px 0;' = 'border-radius: var(--radius-full);'
}

$content = Get-Content -Raw -Path style.css
foreach ($key in $replacements.Keys) {
    $content = $content.Replace($key, $replacements[$key])
}

$content = $content -replace "(?sm)\.nav-login-btn\s*\{[^}]*\}", ""

$content = $content.Replace(".section-header-center {`r`n  text-align: center;", ".section-header {`r`n  text-align: left;")
$content = $content.Replace(".section-header-center {`n  text-align: center;", ".section-header {`n  text-align: left;")

Set-Content -Path style.css -Value $content
