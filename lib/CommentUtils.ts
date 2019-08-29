import {
    BaseNode,
    Comment,
    LineAndColumnData,
    TypeNode
} from "@typescript-eslint/typescript-estree/dist/ts-estree/ts-estree";
import {logger} from "./Core";
import {Utils} from "./Utils";
import {ParsedComment} from "./Types";
import commentParse = require("comment-parser");

const rangeTag = "range";
const defaultTag = "default";
const ignoredTag = "ignored";


/**
 * Utility class for getting information about comments
 */
export class CommentUtils {
    /**
     * Gets comment from a declaration by checking if the comment ends just before the start of the declaration
     *
     * @param comments to comments to search through
     * @param start the place after which a comment should be matched
     * @param end the place before which a comment should be matched
     * @returns the matched comment as a string
     */
    public static getInBetweenComment(comments: Comment[], start: LineAndColumnData, end: LineAndColumnData): string {
        /**
         * @returns whether loc1 occurs after loc2
         */
        function isAfter(loc1: LineAndColumnData, loc2: LineAndColumnData): boolean {
            return loc2.line < loc1.line || (loc1.line === loc2.line && loc2.column <= loc1.column);
        }

        for (let comment of comments) {
            if (isAfter(comment.loc.start, start) && isAfter(end, comment.loc.end)) {
                return CommentUtils.fixComment(comment);
            }
        }
    }

    /**
     * Fixes a comment so it can be parsed by the library that we're using
     *
     * @returns the comment with proper surrounding slashes
     */
    public static fixComment(comment: Comment): string {
        // The TypeScript parser removes some parts of a comment, we add them back
        return `/*${comment.value}*/`;
    }

    /**
     * Gets comment from a declaration by checking if the comment ends on the line before the start of the declaration
     *
     * @param comments the comments to search through
     * @param declaration the declaration to match
     * @returns the matched comment as a string
     */
    public static getComment(comments: Comment[], declaration: BaseNode): string {
        let line = declaration.loc.start.line;
        for (let comment of comments) {
            if (comment.loc.end.line === line - 1) {
                return CommentUtils.fixComment(comment);
            }
        }
    }

    /**
     * Parses a comment and its tags
     *
     * @param comment the comment as a string
     * @param fieldType the class of this field
     * @returns the parsed comment
     */
    public static parseFieldComment(comment: string, fieldType: TypeNode): ParsedComment {
        let range;
        let defaultValue;
        let commentDescription;
        let ignored = false;
        if (comment != null) {
            let parsedComment = commentParse(comment);
            let firstComment = parsedComment[0];
            if (firstComment.description.length !== 0) {
                commentDescription = firstComment.description;
            }
            for (let tag of firstComment.tags) {
                switch (tag.tag.toLowerCase()) {
                    case rangeTag:
                        let type = tag.type.toLowerCase();
                        if (Utils.isValidXsd(fieldType, type)) {
                            range = "xsd:" + type;
                        } else {
                            logger.error(`Found range type ${type} but could not match to ${fieldType.type}`);
                        }
                        break;
                    case defaultTag:
                        if (tag.type.length !== 0) defaultValue = tag.type;
                        break;
                    case ignoredTag:
                        ignored = true;
                        break;
                    default:
                        logger.debug(`Could not understand tag ${tag.tag}`);
                        break;
                }
            }
        }
        return {
            range: range,
            defaultValue: defaultValue,
            ignored: ignored,
            description: commentDescription
        };
    }
}
