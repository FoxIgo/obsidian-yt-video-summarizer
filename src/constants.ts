// Regex pattern for extracting video title from meta tag
export const TITLE_REGEX = /"title":"((?:[^"\\]|\\"|\\\\)+)"/;

// Regex pattern for extracting video ID from YouTube URL
export const VIDEO_ID_REGEX = /(?:v=|\/|shorts\/)([a-zA-Z0-9_-]{11})/;

// Regex pattern for extracting video author from meta tag
export const AUTHOR_REGEX = /"author":"((?:[^"\\]|\\"|\\\\)+)"/;

// Regex pattern for extracting channel ID from video page
export const CHANNEL_ID_REGEX = /"channelId":"([^"]+)"/;

// Regex pattern for extracting ytInitialData from script tag
export const YT_INITIAL_DATA_REGEX = /var ytInitialData\s*=\s*({[\s\S]+?});/;

// Alternative regex patterns for extracting ytInitialData if the main one fails
export const YT_INITIAL_DATA_ALT_REGEX_1 = /window\.ytInitialData\s*=\s*({[\s\S]+?});/;
export const YT_INITIAL_DATA_ALT_REGEX_2 = /ytInitialData\s*=\s*({[\s\S]+?});/;
export const YT_INITIAL_DATA_ALT_REGEX_3 = /"ytInitialData"\s*:\s*({[\s\S]+?})/;

// Regex patterns for extracting visitorData
export const VISITOR_DATA_REGEX_1 = /"visitorData"\s*:\s*"([^"]+)"/;
export const VISITOR_DATA_REGEX_2 = /visitorData['"]\s*:\s*['"]([^"']+)['"]/;

// Regex pattern for extracting video title from meta tag
export const TITLE_META_REGEX = /<meta\s+(?:name="title"|itemprop="name")\s+content="([^"]*)">/;

// Regex pattern for extracting canonical URL from link tag (used to get video ID after splitting)
export const CANONICAL_URL_REGEX = /<link\s+rel="canonical"\s+href="([^"]*)">/;

// Regex for YouTube publish date (meta tag)
export const PUBLISH_DATE_REGEX = /<meta itemprop="datePublished" content="([^"]+)"/;

// Regex for YouTube channel handle (e.g., @username)
// Matches JSON keys or HTML attributes containing /@username (e.g., href, itemid, ownerProfileUrl, canonicalBaseUrl)
// Extracts channel handle from <link itemprop="url" href="http://www.youtube.com/@handle">
export const CHANNEL_HANDLE_REGEX = /<link\s+itemprop="url"\s+href="https?:\/\/www\.youtube\.com\/@([a-zA-Z0-9_.-]+)"/;