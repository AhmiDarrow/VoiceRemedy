$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$voiceRoot = Split-Path $PSScriptRoot -Parent
$sourceText = Get-Content (Join-Path $voiceRoot 'src/lessons.ts') -Raw
$coachBlock = $sourceText.Substring($sourceText.IndexOf('export const coachText'))
$coachMatches = [regex]::Matches($coachBlock, "(?m)^\s+(?:'([^']+)'|(\w+)): '([^']*)',?$")
$outputFolder = Join-Path $voiceRoot 'public/coach'
New-Item -ItemType Directory -Force -Path $outputFolder | Out-Null
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $synth.SelectVoice('Microsoft Zira Desktop')
  $synth.Rate = -2
  $synth.Volume = 90
  foreach ($coachMatch in $coachMatches) {
    $clipName = if ($coachMatch.Groups[1].Success) { $coachMatch.Groups[1].Value } else { $coachMatch.Groups[2].Value }
    $synth.SetOutputToWaveFile((Join-Path $outputFolder "$clipName.wav"))
    $synth.Speak($coachMatch.Groups[3].Value)
    $synth.SetOutputToNull()
    Write-Output "Generated $clipName"
  }
} finally { $synth.Dispose() }
