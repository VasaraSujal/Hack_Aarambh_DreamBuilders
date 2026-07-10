$basePath = 'C:\Users\ABC\OneDrive\Desktop\DreamBuilders_Charusat\Frontend\vite_app\src'
$skipFiles = @('Sidebar.jsx', 'Topbar.jsx', 'Dashboard.jsx', 'LandingPage.jsx', 'Login.jsx', 'SignUp.jsx', 'CallList.jsx')
$files = Get-ChildItem -Path $basePath -Recurse -Include '*.jsx'

foreach ($file in $files) {
    if ($skipFiles -contains $file.Name) {
        Write-Host ('Skipping: ' + $file.Name)
        continue
    }
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace '#090b13', '#fff7ed'
    $content = $content -replace '#0f1222', '#ffffff'
    $content = $content -replace '#0f1221', '#fff7ed'
    $content = $content -replace '#0f1120', '#f8f9fa'
    $content = $content -replace '#10111e', '#ffffff'
    $content = $content -replace '#161829', '#f8f9fa'
    $content = $content -replace '#121527', '#ffffff'
    $content = $content -replace '#121526', '#ffffff'
    $content = $content -replace '#0a0b14', '#ffffff'
    $content = $content -replace '#1b1d2c', '#ffffff'
    $content = $content -replace '#1d2031', '#f1f5f9'
    $content = $content -replace 'text-slate-50\b', 'text-gray-900'
    $content = $content -replace 'text-slate-100\b', 'text-gray-800'
    $content = $content -replace 'text-slate-200\b', 'text-gray-700'
    $content = $content -replace 'text-slate-300\b', 'text-gray-600'
    $content = $content -replace 'text-slate-400\b', 'text-gray-500'
    $content = $content -replace 'text-slate-500\b', 'text-gray-400'
    $content = $content -replace 'text-white\b', 'text-gray-900'
    $content = $content -replace 'border-white/10', 'border-gray-200'
    $content = $content -replace 'border-white/8', 'border-gray-100'
    $content = $content -replace 'border-white/6', 'border-gray-100'
    $content = $content -replace 'border-white/12', 'border-gray-200'
    $content = $content -replace 'border-white/15', 'border-gray-300'
    $content = $content -replace 'bg-white/3\b', 'bg-gray-50'
    $content = $content -replace 'bg-white/4\b', 'bg-gray-100'
    $content = $content -replace 'bg-white/5\b', 'bg-gray-50'
    $content = $content -replace 'bg-white/8\b', 'bg-gray-100'
    $content = $content -replace 'indigo-600', 'orange-500'
    $content = $content -replace 'indigo-700', 'orange-600'
    $content = $content -replace 'indigo-500', 'orange-500'
    $content = $content -replace 'indigo-400', 'orange-500'
    $content = $content -replace 'indigo-300', 'orange-600'
    $content = $content -replace 'border-indigo-500/30', 'border-orange-300'
    $content = $content -replace 'border-indigo-500/25', 'border-orange-300'
    $content = $content -replace 'border-indigo-500/35', 'border-orange-300'
    $content = $content -replace 'border-indigo-500/45', 'border-orange-300'
    $content = $content -replace 'border-indigo-400/30', 'border-orange-300'
    $content = $content -replace 'focus:border-indigo-500', 'focus:border-orange-400'
    $content = $content -replace 'focus:ring-indigo-500', 'focus:ring-orange-400'
    $content = $content -replace 'hover:border-indigo-500', 'hover:border-orange-500'
    $content = $content -replace 'text-indigo-300', 'text-orange-600'
    $content = $content -replace 'text-indigo-400', 'text-orange-500'
    $content = $content -replace 'text-indigo-200', 'text-orange-700'
    $content = $content -replace 'divide-white/6', 'divide-gray-100'
    $content = $content -replace 'py-8 text-slate-200', 'py-8 text-gray-800'
    Set-Content $file.FullName $content -NoNewline
    Write-Host ('Converted: ' + $file.Name)
}
Write-Host 'All done!'
