/**
 * Structural response contracts — coarse checks with expect.any() +
 * toMatchObject(). They catch forgotten fields, mapping regressions and
 * accidental nulls. They COMPLEMENT (do not replace) business-value asserts.
 *
 * Rules:
 *  - required field        → expect.any(String | Number | Boolean)
 *  - array                 → expect.any(Array) | expect.arrayContaining([item])
 *  - enum                  → expect.stringMatching(/^a$|^b$/)
 *  - nullable field        → OMIT here, assert separately (toBeNull/toBeDefined)
 *  - nested object         → nested schema
 */

/** List item — presence + type of every field. */
export const userListItemSchema = {
  id: expect.any(String),
  name: expect.any(String),
  email: expect.any(String),
  createdAt: expect.any(String),
};

/** Details — extends the list item with extra fields. */
export const userDetailsSchema = {
  ...userListItemSchema,
  role: expect.stringMatching(/^admin$|^user$/),
  settings: expect.any(Object),
};

/** Error envelope — match the project's actual error shape. */
export const errorEnvelopeSchema = {
  statusCode: expect.any(Number),
  message: expect.anything(),
};
