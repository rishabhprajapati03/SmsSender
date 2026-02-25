import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  dateDivider: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 24,
    textTransform: 'uppercase',
  },
  bubbleContainer: {
    alignItems: 'flex-start', // Messages usually come "from" someone, so left-aligned
    marginBottom: 20,
  },
  bubble: {
    backgroundColor: '#E9E9EB', // Standard iOS light gray bubble
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 4, // Makes it look like a chat tail
    maxWidth: '85%',
  },
  bodyText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 6,
    marginLeft: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  metaDot: { color: '#C7C7CC' },
  footerInfo: {
    marginTop: 40,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  idText: {
    fontSize: 11,
    color: '#C7C7CC',
    fontFamily: 'monospace',
  },
  errorContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  errorText: { color: '#FF3B30', fontSize: 12 },
});
