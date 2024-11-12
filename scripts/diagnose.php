<?php
  $date = gmdate ("d.m.Y");
  $time = gmdate ("H:i:s");
  $ip = $_SERVER['REMOTE_ADDR'];
  $ua = $_SERVER['HTTP_USER_AGENT'];
  $re = $_SERVER['HTTP_REFERER'];
  $hostname = gethostbyaddr($ip);
  $message .= "=============== LOGGED VIEW ===============\n";
  $message .= "TIME: $time | $date \n";
  $message .= "IP: ".$ip."\n";
  $message .= "REFERER: ".$re."\n";
  $message .= "DEVICE: ".$ua."\n";
  $message .= "===========================================\n";
  $message .= "\r\n\n";
  $file = fopen("../log/visitors.txt","ab");
  fwrite($file,$message);
  fclose($file);
  $data = file_get_contents('../log/analyse.json');
  $json_arr = json_decode($data, true);
  $json_arr[] = array('date' => $date, 'time'=> $time, 'referer' => $re, 'useragent' => $ua);
  file_put_contents('../log/analyse.json', json_encode($json_arr));
?>