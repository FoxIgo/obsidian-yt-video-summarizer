import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { PluginSettings, TranscriptResponse } from './types';

import { SettingsTab } from './ui/settings';
import { YouTubeService } from './services/youtube';
import { YouTubeURLModal } from './ui/modals/youtube-url';
import { PromptService } from './services/prompt';
import { SettingsManager } from './services/settingsManager';
import { ProvidersFactory } from './services/providers/providersFactory';
import { AIModelProvider } from './types';

/**
 * Represents the YouTube Summarizer Plugin.
 * This class extends the Plugin class and provides the main functionality
 * for the YouTube Summarizer Plugin.
 */
export class YouTubeSummarizerPlugin extends Plugin {
    settings: PluginSettings;
    private youtubeService: YouTubeService;
    private promptService: PromptService;
    private provider: AIModelProvider | null = null;
    private isProcessing = false;

    /**
     * Called when the plugin is loaded.
     */
    async onload() {
        try {
            // Initialize services
            await this.initializeServices();

            // Add settings tab
            this.addSettingTab(new SettingsTab(this.app, this));

            // Register commands
            this.registerCommands();
        } catch (error) {
            new Notice(`Error: ${error.message}`);
        }
    }

    public async saveData(data: any): Promise<void> {
        await super.saveData(data);
        await this.initializeServices();
    }

    /**
     * Initializes the plugin services.
     * This method creates instances of the required services and loads the plugin settings.
     * @returns {Promise<void>} A promise that resolves when the services are initialized.
     * @throws {Error} Throws an error if the services cannot be initialized.
     */
    public async initializeServices(): Promise<void> {
        // Initialize settings manager
        this.settings = new SettingsManager(this);
        await this.settings.loadSettings();
        // Initialize youtube service
        this.youtubeService = new YouTubeService();

        // Initialize prompt service
        this.promptService = new PromptService(this.settings.getCustomPrompt());

        // Initialize AI provider
        const selectedModel = this.settings.getSelectedModel();
        if (selectedModel) {
            this.provider = ProvidersFactory.createProvider(selectedModel, this.settings.getMaxTokens(), this.settings.getTemperature());
        }
    }

    /**
     * Registers the plugin commands.
     * This method adds the commands to the Obsidian app.
     * @returns {void}
     */
    private registerCommands(): void {
        // Register the summarize command
        // Command to summarize a YouTube video from URL
        this.addCommand({
            id: 'summarize-youtube-video',
            name: 'Summarize youtube video',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                try {
                    const selectedText = editor.getSelection().trim();
                    if (
                        selectedText &&
                        YouTubeService.isYouTubeUrl(selectedText)
                    ) {
                        await this.summarizeVideo(selectedText, editor);
                    } else if (selectedText) {
                        new Notice('Selected text is not a valid YouTube URL');
                    } else {
                        new YouTubeURLModal(this.app, async (url) => {
                            await this.summarizeVideo(url, editor);
                        }).open();
                    }
                } catch (error) {
                    new Notice(`Failed to process video: ${error.message}`);
                    console.error('Failed to process video:', error);
                }
            },
        });

        // Command to summarize a YouTube video with custom prompt
        this.addCommand({
            id: 'summarize-youtube-video-prompt',
            name: 'Summarize youtube video (with prompt)',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                try {
                    const selectedText = editor.getSelection().trim();
                    if (
                        selectedText &&
                        YouTubeService.isYouTubeUrl(selectedText)
                    ) {
                        await this.summarizeVideo(selectedText, editor);
                    } else if (selectedText) {
                        new Notice('Selected text is not a valid YouTube URL');
                    } else {
                        new YouTubeURLModal(this.app, async (url) => {
                            await this.summarizeVideo(url, editor);
                        }).open();
                    }
                } catch (error) {
                    new Notice(`Failed to process video: ${error.message}`);
                    console.error('Failed to process video:', error);
                }
            },
        });

        // Command to save only subtitles (transcript)
        this.addCommand({
            id: 'save-youtube-subtitles',
            name: 'Save YouTube subtitles only',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                try {
                    const selectedText = editor.getSelection().trim();
                    if (
                        selectedText &&
                        YouTubeService.isYouTubeUrl(selectedText)
                    ) {
                        await this.saveSubtitlesOnly(selectedText, editor);
                    } else if (selectedText) {
                        new Notice('Selected text is not a valid YouTube URL');
                    } else {
                        new YouTubeURLModal(this.app, async (url) => {
                            await this.saveSubtitlesOnly(url, editor);
                        }).open();
                    }
                } catch (error) {
                    new Notice(`Failed to process video: ${error.message}`);
                    console.error('Failed to process video:', error);
                }
            },
        });
    }

    /**
     * Summarizes the YouTube video for the given URL and updates the markdown view with the summary.
     * @param url - The URL of the YouTube video to summarize.
     * @param view - The active markdown view where the summary will be inserted.
     * @returns {Promise<void>} A promise that resolves when the video is summarized.
     */
    private async summarizeVideo(url: string, editor: Editor): Promise<void> {
        // Check if a video is already being processed
        if (this.isProcessing) {
            new Notice('Already processing a video, please wait...');
            return;
        }

        try {
            this.isProcessing = true;
            // Get the selected model
            const selectedModel = this.settings.getSelectedModel();

            if (!selectedModel) {
                new Notice('No AI model selected. Please select a model in the plugin settings.');
                return;
            }

            // Check if the selected model's provider has an API key
            if (!selectedModel.provider.apiKey) {
                new Notice(
                    `${selectedModel.provider.name} API key is missing. Please set it in the plugin settings.`
                );
                return;
            }

            if (!this.provider) {
                new Notice('AI provider not initialized. Please check your settings.');
                return;
            }

            // Fetch the video transcript
            new Notice('Fetching video transcript...');
            let transcript: TranscriptResponse;
            try {
                transcript = await this.youtubeService.fetchTranscript(url);
            } catch (error) {
                new Notice(`Error: ${error.message}`);
                return;
            }
            const thumbnailUrl = YouTubeService.getThumbnailUrl(
                transcript.videoId
            );

            // Build the prompt for LLM
            const prompt = this.promptService.buildPrompt(transcript.lines.map((line) => line.text).join(' '));
            // Generate the summary using the provider
            new Notice('Generating summary...');
            let summary: string;
            try {
                summary = await this.provider.summarizeVideo(transcript.videoId, prompt);
            } catch (error) {
                new Notice(`Error: ${error.message}`);
                console.error('Failed to fetch transcript:', error);
                return;
            }

            // Create the summary content
            // Save transcript with metadata as Markdown file in channel folder
            await this.saveTranscriptToFolder(transcript, url, thumbnailUrl, summary);
            new Notice('Transcript saved to channel folder!');
        } catch (error) {
            new Notice(`Error: ${error.message}`);
            console.error('Summary generation failed:', error);
        } finally {
            // Reset the processing flag
            this.isProcessing = false;
        }
    }

    /**
     * Saves only the transcript and metadata, no summary.
     */
    private async saveSubtitlesOnly(url: string, editor: Editor): Promise<void> {
        if (this.isProcessing) {
            new Notice('Already processing a video, please wait...');
            return;
        }
        try {
            this.isProcessing = true;
            const selectedModel = this.settings.getSelectedModel();
            if (!selectedModel) {
                new Notice('No AI model selected. Please select a model in the plugin settings.');
                return;
            }
            if (!selectedModel.provider.apiKey) {
                new Notice(`${selectedModel.provider.name} API key is missing. Please set it in the plugin settings.`);
                return;
            }
            if (!this.provider) {
                new Notice('AI provider not initialized. Please check your settings.');
                return;
            }
            new Notice('Fetching video transcript...');
            let transcript: TranscriptResponse;
            try {
                transcript = await this.youtubeService.fetchTranscript(url);
            } catch (error) {
                new Notice(`Error: ${error.message}`);
                return;
            }
            const thumbnailUrl = YouTubeService.getThumbnailUrl(transcript.videoId);
            await this.saveTranscriptToFolder(transcript, url, thumbnailUrl);
            new Notice('Transcript saved to channel folder!');
        } catch (error) {
            new Notice(`Error: ${error.message}`);
            console.error('Transcript-only save failed:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Saves the transcript and metadata as a Markdown file in a folder named after the channel.
     * @param transcript - The transcript response containing metadata and lines.
     * @param videoUrl - The YouTube video URL.
     */
    async saveTranscriptToFolder(transcript: TranscriptResponse, videoUrl: string, thumbnailUrl: string, summaryText?: string) {
        const { author, title, videoId, lines } = transcript;
    // Always use channel handle (@username) for folder name, fallback to 'unknown_channel' if not found
    const handle = transcript.channelHandle ? transcript.channelHandle : 'unknown_channel';
    const channelFolder = `YouTube/${handle}`;
        const fileName = `${title.replace(/[/\\?%*:|"<>]/g, "-") || videoId}.md`;
        const filePath = `${channelFolder}/${fileName}`;

        // Ensure channel folder exists
        const vault = (this as any).app.vault;
        if (!vault.getAbstractFileByPath(channelFolder)) {
            await vault.createFolder(channelFolder);
        }

        // Build YAML frontmatter for Obsidian properties
        const channelUrl = transcript.channelUrl || '';
        const publishDate = transcript.publishDate || '';
        const yamlFrontmatter = [
            '---',
            `title: "${title}"`,
            `channel_name: "${author}"`,
            `channel_username: "${handle}"`,
            `channel_url: "${channelUrl}"`,
            `video_url: "${videoUrl}"`,
            `video_id: "${videoId}"`,
            `publish_date: "${publishDate}"`,
            '---',
        ].join('\n');

        const transcriptText = lines.map(line => line.text).join('\n');
        const content = `${yamlFrontmatter}\n\n# ${title}\n\n![Thumbnail](${thumbnailUrl})\n\n${transcriptText}`;

        // Create or overwrite the Markdown file
        const existingFile = vault.getAbstractFileByPath(filePath);
        if (existingFile) {
            await vault.modify(existingFile, content);
        } else {
            await vault.create(filePath, content);
        }
    }
    private generateSummary(
        transcript: TranscriptResponse,
        thumbnailUrl: string,
        url: string,
        summaryText: string
    ): string {
        // Initialize summary parts with title, thumbnail, video link, author, and summary
        const summaryParts = [
            `# ${transcript.title}\n`,
            `![Thumbnail](${thumbnailUrl})\n`,
            `👤 [${transcript.author}](${transcript.channelUrl})  🔗 [Watch video](${url})`,
            summaryText,
        ];

        return summaryParts.join('\n');
    }
}

export default YouTubeSummarizerPlugin;