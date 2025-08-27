<?php
// URL target (misalnya LK21)
$targetUrl = "https://tv6.lk21official.cc/";

// Ambil konten dari target
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// Supaya dapat konten lengkap
curl_setopt($ch, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT'] ?? 'Mozilla/5.0');

$response = curl_exec($ch);
curl_close($ch);

// Hapus header yang menghalangi iframe
header("Content-Type: text/html; charset=UTF-8");
header("X-Frame-Options: ");
header("Content-Security-Policy: ");

echo $response;
