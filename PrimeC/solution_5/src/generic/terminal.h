#pragma once
#include <sys/ioctl.h> // ioctl, winsize
#include <unistd.h>    // isatty, STDOUT_FILENO
#include <stdio.h>     // printf, vsnprintf, fflush
#include <stdarg.h>    // va_list, va_start, va_end
#include <string.h>    // memcpy

// ANSI color codes
#define COLOR_RED         "\033[31m"
#define COLOR_GREEN       "\033[32m"
#define COLOR_YELLOW      "\033[33m"
#define COLOR_BLUE        "\033[34m"
#define COLOR_MAGENTA     "\033[35m"
#define COLOR_BOLD        "\033[1m"
#define COLOR_BLINK       "\033[5m"
#define COLOR_BLINK_OFF   "\033[25m"
#define COLOR_UNDERLINE   "\033[4m"
#define COLOR_RESET       "\033[0m"
#define COLOR_BOLD_YELLOW "\033[1;33m"
#define COLOR_BOLD_GREEN  "\033[1;32m"
#define COLOR_DARK_GRAY   "\033[0;90m"
#define COLOR_CLEAR_LINE  "\33[2K\r"
#define COLOR_WRAP_OFF    "\033[?7l"
#define COLOR_WRAP_ON     "\033[?7h"

static inline size_t getTerminalWidth(void)
{
    struct winsize window_size = {0};

    if (isatty(STDOUT_FILENO) && ioctl(STDOUT_FILENO, TIOCGWINSZ, &window_size) == 0 && window_size.ws_col > 0) {
        return window_size.ws_col;
    }

    return 120;
}

static inline size_t getVisibleTextLength(const char* text)
{
    size_t visible_length = 0;

    for (size_t index = 0; text[index] != '\0'; index++) {
        if (text[index] == '\r') continue;

        if (text[index] == '\033' && text[index + 1] == '[') {
            index += 2;
            while (text[index] != '\0' && (unsigned char)text[index] < '@') index++;
            continue;
        }

        visible_length++;
    }

    return visible_length;
}

static inline void printf_statusline(const char* format, ...)
{
    char formatted_text[1024] = {0};
    char clipped_text[1024] = {0};
    va_list arguments;

    va_start(arguments, format);
    vsnprintf(formatted_text, sizeof(formatted_text), format, arguments);
    va_end(arguments);

    const size_t terminal_width = getTerminalWidth();
    const size_t visible_limit = terminal_width > 1 ? terminal_width - 1 : 1;
    const size_t visible_length = getVisibleTextLength(formatted_text);

    if (visible_length <= visible_limit) {
        fputs(COLOR_CLEAR_LINE COLOR_WRAP_OFF, stdout);
        fputs(formatted_text, stdout);
        fputs(COLOR_WRAP_ON, stdout);
        fflush(stdout);
        return;
    }

    const size_t ellipsis_length = visible_limit > 3 ? 3 : 0;
    const size_t clipped_visible_limit = visible_limit - ellipsis_length;
    size_t source_index = 0;
    size_t target_index = 0;
    size_t clipped_visible_length = 0;

    while (formatted_text[source_index] != '\0' && target_index + 1 < sizeof(clipped_text)) {
        if (formatted_text[source_index] == '\r') {
            source_index++;
            continue;
        }

        if (formatted_text[source_index] == '\033' && formatted_text[source_index + 1] == '[') {
            do {
                clipped_text[target_index++] = formatted_text[source_index++];
            } while (formatted_text[source_index] != '\0'
                  && target_index + 1 < sizeof(clipped_text)
                  && ((unsigned char)formatted_text[source_index - 1] < '@' || formatted_text[source_index - 1] == '['));

            if (formatted_text[source_index] != '\0' && target_index + 1 < sizeof(clipped_text)) {
                clipped_text[target_index++] = formatted_text[source_index++];
            }
            continue;
        }

        if (clipped_visible_length >= clipped_visible_limit) break;

        clipped_text[target_index++] = formatted_text[source_index++];
        clipped_visible_length++;
    }

    if (ellipsis_length && target_index + ellipsis_length + sizeof(COLOR_RESET) < sizeof(clipped_text)) {
        memcpy(&clipped_text[target_index], "...", ellipsis_length);
        target_index += ellipsis_length;
        memcpy(&clipped_text[target_index], COLOR_RESET, sizeof(COLOR_RESET) - 1);
        target_index += sizeof(COLOR_RESET) - 1;
    }

    clipped_text[target_index] = '\0';
    fputs(COLOR_CLEAR_LINE COLOR_WRAP_OFF, stdout);
    fputs(clipped_text, stdout);
    fputs(COLOR_WRAP_ON, stdout);
    fflush(stdout);
}