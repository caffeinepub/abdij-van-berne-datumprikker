import Map "mo:core/Map";
import Text "mo:core/Text";

module {
  // Previous actor type acted as a persistent field with default participants after initialization.
  type OldActor = { participants : Map.Map<Text, [Text]> };

  // New actor type with stable participants.
  type NewActor = { participants : Map.Map<Text, [Text]> };

  // Migrates the default participants from the persistent field to the stable participants in the new version rather than discarding them.
  public func run(old : OldActor) : NewActor {
    { participants = old.participants };
  };
};
