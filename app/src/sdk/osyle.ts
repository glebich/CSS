/**
 * The app consumes the one SDK truth from packages/sdk. The local
 * transport is Demo Mode's permanent home; Real Mode flips the
 * transport flag here and nothing else in the app changes.
 */
export { createClient, type OsyleClient, type Row, type SdkUser } from "@osyle/sdk";
